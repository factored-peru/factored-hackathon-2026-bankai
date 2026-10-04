import type { QueryCatalogEntry } from "../../domain/data/query-catalog.js";
import { projectRows } from "../../services/data/query-row-projection.js";
import type {
	QueryParameterValues,
	StructuredQueryExecutor,
	StructuredQueryResult,
} from "../../services/ports/structured-query.js";

export type StructuredQueryCall = Readonly<{
	queryId: string;
	version: string;
	parameters: QueryParameterValues;
}>;

type RowSource = (
	parameters: QueryParameterValues,
) => readonly Readonly<Record<string, unknown>>[];

/**
 * Volatile double for tests: serves canned rows per `queryId@version` and
 * records every call so tests can assert which parameters were bound. It
 * applies the same row projection as the real adapter.
 */
export class InMemoryStructuredQueryExecutor
	implements StructuredQueryExecutor
{
	readonly calls: StructuredQueryCall[] = [];

	constructor(private readonly sources: ReadonlyMap<string, RowSource>) {}

	async execute(input: {
		entry: QueryCatalogEntry;
		parameters: QueryParameterValues;
		traceId: string;
	}): Promise<StructuredQueryResult> {
		const { entry } = input;
		this.calls.push({
			queryId: entry.queryId,
			version: entry.version,
			parameters: input.parameters,
		});
		const source = this.sources.get(`${entry.queryId}@${entry.version}`);
		if (source === undefined) {
			return { status: "failed", reasonCode: "query_failed" };
		}
		const raw = source(input.parameters);
		if (raw.length > entry.maxRows) {
			return { status: "failed", reasonCode: "query_row_limit_exceeded" };
		}
		const rows = projectRows(entry.columns, raw);
		return rows === null
			? { status: "failed", reasonCode: "query_result_shape_mismatch" }
			: {
					status: "ready",
					rows,
					jobId: null,
					bytesProcessed: 0,
					durationMs: 0,
				};
	}
}
