import { z } from "zod";
import { dataClassificationSchema } from "../../domain/control/contracts.js";
import type { QueryPlan } from "../../domain/data/query-plan.js";
import type { SessionContext } from "../../domain/session.js";
import type { StructuredQueryPlanCatalog } from "../data/structured-query-plan-catalog.js";
import type { QueryPlanExecutor } from "../ports/retrieval.js";
import { BaseRag, type RagExecutionResult } from "./base-rag.js";
import type { RagCatalog } from "./rag-catalog.js";

export const structuredEvidenceDtoSchema = z
	.object({
		content: z.string().min(1),
		documentRef: z.string().min(1),
		sourceType: z.literal("bigquery_structured"),
		classification: dataClassificationSchema,
		contentHash: z.string().min(1),
	})
	.strict();
export type StructuredEvidenceDto = z.infer<typeof structuredEvidenceDtoSchema>;

/** The specialized Jev may select an ID and scalar values, never SQL. */
export interface StructuredQuerySelector {
	select(input: {
		query: string;
		catalog: RagCatalog;
		traceId: string;
	}): Promise<QueryPlan | null>;
}

/** Structured RAG is a closed BigQuery catalog, never text-to-SQL. */
export class StructuredRag extends BaseRag {
	readonly kind = "structured" as const;

	constructor(
		private readonly selector: StructuredQuerySelector,
		private readonly plans: StructuredQueryPlanCatalog,
		private readonly executor: QueryPlanExecutor,
	) {
		super();
	}

	async execute(input: {
		query: string;
		session: SessionContext;
		catalog: RagCatalog;
		traceId: string;
	}): Promise<RagExecutionResult> {
		if (
			input.catalog.kind !== this.kind ||
			input.catalog.version !== this.plans.version
		) {
			return { status: "failed", reasonCode: "structured_catalog_mismatch" };
		}
		let selected: QueryPlan | null;
		try {
			selected = await this.selector.select({
				query: input.query,
				catalog: input.catalog,
				traceId: input.traceId,
			});
		} catch {
			return {
				status: "failed",
				reasonCode: "structured_selection_unavailable",
			};
		}
		if (
			selected === null ||
			!input.catalog.entries.some((entry) => entry.id === selected.queryId)
		) {
			return { status: "failed", reasonCode: "structured_query_not_selected" };
		}
		const resolved = this.plans.resolve(selected, input.session);
		if (resolved.status !== "ready") {
			return { status: "failed", reasonCode: resolved.reasonCode };
		}
		try {
			const rows = await this.executor.execute(
				resolved,
				input.session.tenantId,
			);
			const evidence = z.array(structuredEvidenceDtoSchema).safeParse(rows);
			if (!evidence.success) {
				return { status: "failed", reasonCode: "structured_evidence_invalid" };
			}
			return evidence.data.every(
				(item) =>
					item.documentRef ===
					`${resolved.definition.queryId}:${resolved.definition.version}`,
			)
				? { status: "ready", evidence: evidence.data }
				: {
						status: "failed",
						reasonCode: "structured_evidence_provenance_invalid",
					};
		} catch {
			return { status: "failed", reasonCode: "structured_query_unavailable" };
		}
	}
}
