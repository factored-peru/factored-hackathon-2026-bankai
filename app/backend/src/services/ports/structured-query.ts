import type { QueryCatalogEntry } from "../../domain/data/query-catalog.js";

/** Fully bound values: validated caller values plus session-injected ones. */
export type QueryParameterValues = Readonly<
	Record<string, string | number | boolean>
>;

export type QueryCell = string | number | boolean | null;

export type StructuredQueryFailure =
	| "query_invalid_parameters"
	| "query_cost_limit_exceeded"
	| "query_timeout"
	| "query_row_limit_exceeded"
	| "query_result_shape_mismatch"
	| "query_failed";

export type StructuredQueryResult =
	| Readonly<{
			status: "ready";
			/** Only the columns the catalog entry declares, normalized to scalars. */
			rows: readonly Readonly<Record<string, QueryCell>>[];
			jobId: string | null;
			bytesProcessed: number | null;
			durationMs: number;
	  }>
	| Readonly<{ status: "failed"; reasonCode: StructuredQueryFailure }>;

/**
 * Runs one catalog entry with already-bound parameters. Failures carry a closed
 * reason code and never the provider message, which may echo SQL or tables.
 */
export interface StructuredQueryExecutor {
	execute(input: {
		entry: QueryCatalogEntry;
		parameters: QueryParameterValues;
		traceId: string;
	}): Promise<StructuredQueryResult>;
}

export type DryRunResult =
	| Readonly<{
			status: "ready";
			bytesProcessed: number | null;
			schema: readonly Readonly<{ name: string; type: string }>[];
	  }>
	| Readonly<{ status: "failed"; reasonCode: StructuredQueryFailure }>;

/** Validates a catalog entry against the real tables without reading rows. */
export interface StructuredQueryDryRunner {
	dryRun(input: { entry: QueryCatalogEntry }): Promise<DryRunResult>;
}
