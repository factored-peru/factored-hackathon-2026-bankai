import { BigQuery, type Query, type RowMetadata } from "@google-cloud/bigquery";
import type {
	QueryPlan,
	StructuredQueryDefinition,
} from "../../domain/data/query-plan.js";
import type { StructuredQueryResolution } from "../../services/data/structured-query-plan-catalog.js";
import type { QueryPlanExecutor } from "../../services/ports/retrieval.js";

export interface BigQueryQueryClient {
	query(options: Query): Promise<[RowMetadata[]]>;
}

export type BigQueryQueryPlanExecutorOptions = Readonly<{
	projectId: string;
	location: string;
}>;

/**
 * BigQuery adapter using Application Default Credentials. It intentionally
 * accepts a resolved catalog plan, never SQL or a table name from a caller.
 */
export class BigQueryQueryPlanExecutor implements QueryPlanExecutor {
	constructor(private readonly client: BigQueryQueryClient) {}

	async execute(
		resolved: StructuredQueryResolution & { status: "ready" },
		tenantId: string,
	): Promise<unknown[]> {
		const [rows] = await this.client.query(
			toBigQueryQuery(resolved.definition, resolved.plan, tenantId),
		);
		return rows;
	}
}

export function createBigQueryQueryPlanExecutor(
	options: BigQueryQueryPlanExecutorOptions,
): BigQueryQueryPlanExecutor {
	const client = new BigQuery({
		projectId: options.projectId,
		location: options.location,
	});
	return new BigQueryQueryPlanExecutor({
		query: async (query) => {
			const [rows] = await client.query(query);
			return [rows];
		},
	});
}

function toBigQueryQuery(
	definition: StructuredQueryDefinition,
	plan: QueryPlan,
	tenantId: string,
): Query {
	return {
		query: definition.sql,
		params: { ...plan.parameters, tenant_id: tenantId },
		parameterMode: "NAMED",
		useLegacySql: false,
		maximumBytesBilled: String(definition.maximumBytesBilled),
		jobTimeoutMs: definition.timeoutMs,
		maxResults: definition.maximumRows,
		labels: {
			component: "structured_rag",
			query_id: definition.queryId,
			catalog_version: definition.version,
		},
	};
}
