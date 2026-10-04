import { createHash } from "node:crypto";
import type { BigQuery } from "@google-cloud/bigquery";
import type {
	QueryCatalogEntry,
	QueryParameter,
} from "../../domain/data/query-catalog.js";
import { projectRows } from "../../services/data/query-row-projection.js";
import type {
	DryRunResult,
	QueryParameterValues,
	StructuredQueryDryRunner,
	StructuredQueryExecutor,
	StructuredQueryFailure,
	StructuredQueryResult,
} from "../../services/ports/structured-query.js";

type QueryJobOptions = Readonly<{
	query: string;
	params: Record<string, string | number | boolean>;
	types: Record<string, string>;
	location: string;
	maximumBytesBilled: string;
	jobTimeoutMs: number;
	labels: Record<string, string>;
	useLegacySql: false;
	dryRun?: boolean;
}>;

export type BigQueryJob = Readonly<{
	jobId: string | null;
	/** Output schema reported for a dry run; null when absent. */
	schema: readonly Readonly<{ name: string; type: string }>[] | null;
	/** Estimate reported at job creation (dry run); null when absent. */
	totalBytesProcessed: number | null;
	getRows(maxResults: number): Promise<{
		rows: readonly Readonly<Record<string, unknown>>[];
		totalBytesProcessed: number | null;
	}>;
}>;

/** The slice of the BigQuery client this adapter needs, so tests need no network. */
export interface BigQueryClientLike {
	createQueryJob(options: QueryJobOptions): Promise<BigQueryJob>;
}

function toNumber(value: string | null | undefined): number | null {
	if (value === undefined || value === null) {
		return null;
	}
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : null;
}

/** Wraps the real client. Creating it does not open a connection. */
export function wrapBigQuery(client: BigQuery): BigQueryClientLike {
	return {
		async createQueryJob(options) {
			// A DATE passed as a plain string is mis-bound by the client (a dry run
			// estimated 0 bytes for a 556 MB scan), so it is wrapped explicitly.
			const params = Object.fromEntries(
				Object.entries(options.params).map(([name, value]) => [
					name,
					options.types[name] === "DATE" && typeof value === "string"
						? client.date(value)
						: value,
				]),
			);
			const [job] = await client.createQueryJob({ ...options, params });
			const statistics = job.metadata?.statistics;
			return {
				jobId: job.id ?? null,
				schema:
					statistics?.query?.schema?.fields?.map(
						(field: { name?: string; type?: string }) => ({
							name: field.name ?? "",
							type: field.type ?? "",
						}),
					) ?? null,
				totalBytesProcessed: toNumber(
					statistics?.query?.totalBytesProcessed ??
						statistics?.totalBytesProcessed,
				),
				async getRows(maxResults) {
					const [rows, , response] = await job.getQueryResults({
						maxResults,
						wrapIntegers: false,
					});
					return {
						rows,
						totalBytesProcessed: toNumber(
							(response as { totalBytesProcessed?: string } | undefined | null)
								?.totalBytesProcessed,
						),
					};
				},
			};
		},
	};
}

const BIGQUERY_TYPE: Readonly<Record<QueryParameter["type"], string>> = {
	string: "STRING",
	int64: "INT64",
	float64: "FLOAT64",
	bool: "BOOL",
	date: "DATE",
};

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function matchesType(parameter: QueryParameter, value: unknown): boolean {
	switch (parameter.type) {
		case "string":
			return typeof value === "string";
		case "date":
			return typeof value === "string" && DATE_PATTERN.test(value);
		case "int64":
			return typeof value === "number" && Number.isSafeInteger(value);
		case "float64":
			return typeof value === "number" && Number.isFinite(value);
		case "bool":
			return typeof value === "boolean";
	}
}

/**
 * Defensive binding check. Semantic limits (length, allowed values, ranges) are
 * enforced earlier; here every declared parameter must be present with the
 * declared type and nothing undeclared may be sent.
 */
function bind(
	entry: QueryCatalogEntry,
	values: QueryParameterValues,
): {
	params: QueryJobOptions["params"];
	types: QueryJobOptions["types"];
} | null {
	const declared = new Set(entry.parameters.map((parameter) => parameter.name));
	if (Object.keys(values).some((name) => !declared.has(name))) {
		return null;
	}
	const params: Record<string, string | number | boolean> = {};
	const types: Record<string, string> = {};
	for (const parameter of entry.parameters) {
		const value = values[parameter.name];
		if (value === undefined || !matchesType(parameter, value)) {
			return null;
		}
		params[parameter.name] = value;
		types[parameter.name] = BIGQUERY_TYPE[parameter.type];
	}
	return { params, types };
}

function normalizeCell(value: unknown): unknown {
	if (typeof value === "object" && value !== null && "value" in value) {
		// BigQueryDate and BigQueryTimestamp wrap their ISO string in `value`.
		const inner = (value as { value: unknown }).value;
		return typeof inner === "string" ? inner : undefined;
	}
	return value;
}

function normalizeRow(
	row: Readonly<Record<string, unknown>>,
): Record<string, unknown> {
	return Object.fromEntries(
		Object.entries(row).map(([name, value]) => [name, normalizeCell(value)]),
	);
}

function classify(error: unknown): StructuredQueryFailure {
	const reasons =
		(error as { errors?: readonly { reason?: string }[] } | null)?.errors?.map(
			(item) => item.reason,
		) ?? [];
	if (reasons.includes("bytesBilledLimitExceeded")) {
		return "query_cost_limit_exceeded";
	}
	if (reasons.includes("timeout")) {
		return "query_timeout";
	}
	return "query_failed";
}

function label(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9_-]/g, "_")
		.slice(0, 63);
}

export type BigQueryQueryExecutorOptions = Readonly<{
	client: BigQueryClientLike;
	/** Must match the dataset location, for example `us-central1`. */
	location: string;
	jobTimeoutMs?: number;
	now?: () => number;
}>;

const SAMPLE_VALUES: Readonly<
	Record<QueryParameter["type"], string | number | boolean>
> = {
	string: "sample",
	int64: 0,
	float64: 0,
	bool: false,
	date: "2000-01-01",
};

/**
 * Runs catalog entries as parameterized, cost-capped BigQuery jobs. Tables are
 * always fully qualified in the SQL, so no default dataset is ever set.
 */
export class BigQueryQueryExecutor
	implements StructuredQueryExecutor, StructuredQueryDryRunner
{
	private readonly now: () => number;
	private readonly jobTimeoutMs: number;

	constructor(private readonly options: BigQueryQueryExecutorOptions) {
		this.now = options.now ?? Date.now;
		this.jobTimeoutMs = options.jobTimeoutMs ?? 30_000;
	}

	async execute(input: {
		entry: QueryCatalogEntry;
		parameters: QueryParameterValues;
		traceId: string;
	}): Promise<StructuredQueryResult> {
		const { entry } = input;
		const bound = bind(entry, input.parameters);
		if (bound === null) {
			return { status: "failed", reasonCode: "query_invalid_parameters" };
		}

		const startedAt = this.now();
		try {
			const job = await this.options.client.createQueryJob(
				this.jobOptions(entry, bound, input.traceId),
			);
			// One extra row detects a result larger than the entry allows.
			const result = await job.getRows(entry.maxRows + 1);
			if (result.rows.length > entry.maxRows) {
				return { status: "failed", reasonCode: "query_row_limit_exceeded" };
			}
			const rows = projectRows(entry.columns, result.rows.map(normalizeRow));
			if (rows === null) {
				return { status: "failed", reasonCode: "query_result_shape_mismatch" };
			}
			return {
				status: "ready",
				rows,
				jobId: job.jobId,
				bytesProcessed: result.totalBytesProcessed,
				durationMs: this.now() - startedAt,
			};
		} catch (error) {
			return { status: "failed", reasonCode: classify(error) };
		}
	}

	async dryRun(input: { entry: QueryCatalogEntry }): Promise<DryRunResult> {
		const { entry } = input;
		const values = Object.fromEntries(
			entry.parameters.map((parameter) => [
				parameter.name,
				SAMPLE_VALUES[parameter.type],
			]),
		);
		const bound = bind(entry, values);
		if (bound === null) {
			return { status: "failed", reasonCode: "query_invalid_parameters" };
		}
		try {
			const job = await this.options.client.createQueryJob({
				...this.jobOptions(entry, bound, "dry-run"),
				dryRun: true,
			});
			return {
				status: "ready",
				bytesProcessed: job.totalBytesProcessed,
				schema: job.schema ?? [],
			};
		} catch (error) {
			return { status: "failed", reasonCode: classify(error) };
		}
	}

	private jobOptions(
		entry: QueryCatalogEntry,
		bound: {
			params: QueryJobOptions["params"];
			types: QueryJobOptions["types"];
		},
		traceId: string,
	): QueryJobOptions {
		return {
			query: entry.sql,
			params: bound.params,
			types: bound.types,
			location: this.options.location,
			maximumBytesBilled: String(entry.maximumBytesBilled),
			jobTimeoutMs: this.jobTimeoutMs,
			labels: {
				app: "bankai-backend",
				query_id: label(entry.queryId),
				query_version: label(entry.version),
				trace: createHash("sha256").update(traceId).digest("hex").slice(0, 32),
			},
			useLegacySql: false,
		};
	}
}
