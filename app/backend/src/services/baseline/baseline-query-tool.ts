import { z } from "zod";
import type {
	QueryCatalog,
	QueryCatalogEntry,
} from "../../domain/data/query-catalog.js";
import { loadQueryCatalog } from "../data/query-catalog-loader.js";
import { bindQueryParameters } from "../data/query-parameter-binder.js";
import type { SqlValidationOptions } from "../data/query-sql-validator.js";
import {
	type BaselineContextTool,
	type BaselineToolCall,
	type BaselineToolDefinition,
	type BaselineToolResult,
	baselineRetrievalToolName,
} from "../ports/baseline-chat.js";
import type { CustomerIdentityResolver } from "../ports/customer-identity.js";
import type { QueryCatalogSource } from "../ports/retrieval.js";
import type { StructuredQueryExecutor } from "../ports/structured-query.js";

const callSchema = z
	.object({
		queryId: z.string().min(1),
		version: z.string().min(1),
		parameters: z.record(z.string(), z.unknown()),
	})
	.strict();

type Dependencies = Readonly<{
	source: QueryCatalogSource;
	options: SqlValidationOptions;
	executor: StructuredQueryExecutor;
	identity: CustomerIdentityResolver;
}>;

/**
 * Ungated tool selection over a reviewed QueryPlan document. It deliberately
 * skips role filtering and evidence projection, but preserves bound customer
 * scope plus the executor's declared row, byte and timeout limits.
 */
export class BaselineQueryTool implements BaselineContextTool {
	private catalog: QueryCatalog | null = null;

	constructor(private readonly dependencies: Dependencies) {}

	async describe(): Promise<BaselineToolDefinition> {
		const catalog = await this.load();
		const plans = catalog.entries.map((entry) => ({
			queryId: entry.queryId,
			version: entry.version,
			description: entry.description,
			parameters: entry.parameters
				.filter((parameter) => parameter.source === "caller")
				.map((parameter) => ({
					name: parameter.name,
					type: parameter.type,
				})),
		}));
		return {
			name: baselineRetrievalToolName,
			description: `Retrieve customer context using exactly one QueryPlan: ${JSON.stringify(plans)}`,
			parametersJsonSchema: {
				type: "object",
				additionalProperties: false,
				required: ["queryId", "version", "parameters"],
				properties: {
					queryId: { type: "string" },
					version: { type: "string" },
					parameters: { type: "object" },
				},
			},
		};
	}

	async retrieve(input: {
		call: BaselineToolCall;
		session: Parameters<CustomerIdentityResolver["resolve"]>[0];
		traceId: string;
	}): Promise<BaselineToolResult> {
		if (input.call.name !== baselineRetrievalToolName) {
			return failed("baseline_tool_not_allowed");
		}
		const parsed = callSchema.safeParse(input.call.args);
		if (!parsed.success) return failed("baseline_query_plan_invalid");
		let catalog: QueryCatalog;
		try {
			catalog = await this.load();
		} catch {
			return failed("baseline_catalog_unavailable");
		}
		const entry = catalog.entries.find(
			(candidate) =>
				candidate.queryId === parsed.data.queryId &&
				candidate.version === parsed.data.version,
		);
		if (entry === undefined) return failed("baseline_query_plan_unknown");
		const bound = bindQueryParameters(entry, {
			caller: parsed.data.parameters,
			customerId: await this.dependencies.identity.resolve(input.session),
			tenantId: input.session.tenantId,
		});
		if (bound.status !== "ready") return failed(bound.reasonCode, entry);
		const result = await this.dependencies.executor.execute({
			entry,
			parameters: bound.values,
			traceId: input.traceId,
		});
		if (result.status !== "ready") return failed(result.reasonCode, entry);
		return {
			status: "ready",
			queryId: entry.queryId,
			queryVersion: entry.version,
			rows: result.rows,
			rowCount: result.rows.length,
			bytesProcessed: result.bytesProcessed,
			durationMs: result.durationMs,
			reasonCode: null,
		};
	}

	private async load(): Promise<QueryCatalog> {
		if (this.catalog !== null) return this.catalog;
		const result = loadQueryCatalog(
			await this.dependencies.source.read(),
			this.dependencies.options,
		);
		if (result.status !== "ready") throw new Error("baseline_catalog_invalid");
		this.catalog = result.catalog;
		return this.catalog;
	}
}

function failed(
	reasonCode: string,
	entry?: QueryCatalogEntry,
): BaselineToolResult {
	return {
		status: "failed",
		queryId: entry?.queryId ?? null,
		queryVersion: entry?.version ?? null,
		rows: [],
		rowCount: 0,
		bytesProcessed: null,
		durationMs: null,
		reasonCode,
	};
}
