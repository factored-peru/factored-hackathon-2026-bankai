import { z } from "zod";
import type { QueryCatalogEntry } from "../../domain/data/query-catalog.js";
import type { SessionContext } from "../../domain/session.js";
import { bindQueryParameters } from "../data/query-parameter-binder.js";
import type { CustomerIdentityResolver } from "../ports/customer-identity.js";
import type { StructuredQueryExecutor } from "../ports/structured-query.js";
import { BaseRag, type RagExecutionResult } from "./base-rag.js";
import type { RagCatalog } from "./rag-catalog.js";
import { buildEvidence, toModelEvidence } from "./structured-evidence.js";

export const structuredSelectionSchema = z.discriminatedUnion("decision", [
	z.object({ decision: z.literal("select"), queryId: z.string().min(1), version: z.string().min(1), parameters: z.record(z.string(), z.unknown()) }).strict(),
	z.object({ decision: z.literal("ambiguous") }).strict(),
	z.object({ decision: z.literal("deny") }).strict(),
]);
export type StructuredSelection = z.infer<typeof structuredSelectionSchema>;

export interface StructuredQuerySelector {
	select(input: { query: string; catalog: RagCatalog; traceId: string }): Promise<unknown>;
}

export interface StructuredQueryEntries {
	resolve(input: { session: SessionContext; queryId: string; version: string }): Promise<QueryCatalogEntry | null>;
}

export type StructuredRagDependencies = Readonly<{
	selector: StructuredQuerySelector;
	entries: StructuredQueryEntries;
	identity: CustomerIdentityResolver;
	executor: StructuredQueryExecutor;
	now?: () => Date;
}>;

function failed(reasonCode: string): RagExecutionResult {
	return { status: "failed", reasonCode };
}

/** Closed, catalog-based BigQuery retrieval. SQL and identity bindings are never model input. */
export class StructuredRag extends BaseRag {
	readonly kind = "structured" as const;
	private readonly now: () => Date;

	constructor(private readonly dependencies: StructuredRagDependencies) {
		super();
		this.now = dependencies.now ?? (() => new Date());
	}

	async execute(input: { query: string; session: SessionContext; catalog: RagCatalog; traceId: string }): Promise<RagExecutionResult> {
		if (input.catalog.kind !== this.kind) return failed("structured_catalog_mismatch");
		let proposal: unknown;
		try {
			proposal = await this.dependencies.selector.select({ query: input.query, catalog: input.catalog, traceId: input.traceId });
		} catch {
			return failed("structured_selection_unavailable");
		}
		const selection = structuredSelectionSchema.safeParse(proposal);
		if (!selection.success) return failed("structured_selection_invalid");
		if (selection.data.decision === "ambiguous") return failed("structured_selection_ambiguous");
		if (selection.data.decision === "deny") return failed("structured_query_not_selected");
		const { queryId, version, parameters } = selection.data;
		const listed = input.catalog.entries.some((entry) => entry.id === queryId && entry.version === version);
		const entry = listed ? await this.dependencies.entries.resolve({ session: input.session, queryId, version }) : null;
		if (entry === null) return failed("structured_query_not_authorized");
		const bound = bindQueryParameters(entry, { caller: parameters, customerId: await this.dependencies.identity.resolve(input.session), tenantId: input.session.tenantId });
		if (bound.status !== "ready") return failed(bound.reasonCode === "query_parameter_missing" ? "structured_parameters_missing" : bound.reasonCode === "query_customer_unlinked" ? "structured_customer_unlinked" : "structured_parameters_invalid");
		const result = await this.dependencies.executor.execute({ entry, parameters: bound.values, traceId: input.traceId });
		if (result.status !== "ready") return failed(`structured_${result.reasonCode}`);
		const evidence = buildEvidence({ entry, catalogVersion: input.catalog.version, filters: bound.filters, result, retrievedAt: this.now() });
		return evidence === null ? failed("structured_evidence_invalid") : { status: "ready", evidence: [toModelEvidence(evidence)] };
	}
}
