import { describe, expect, test } from "bun:test";
import type { QueryCatalogEntry } from "../src/domain/data/query-catalog.js";
import {
	type BigQueryClientLike,
	BigQueryQueryExecutor,
	wrapBigQuery,
} from "../src/integrations/bigquery/bigquery-query-executor.js";
import { InMemoryStructuredQueryExecutor } from "../src/integrations/memory/in-memory-structured-query-executor.js";
import { checkDryRun } from "../src/services/data/query-dry-run-check.js";
import { projectRows } from "../src/services/data/query-row-projection.js";

const entry: QueryCatalogEntry = {
	queryId: "recent_transactions",
	version: "v1",
	description: "Transactions of one product in a date range.",
	sql: "SELECT transaction_id, transaction_date, amount, response_code FROM `p.d.transactions` WHERE customer_id = @customer_id AND product_id = @product_id AND DATE(transaction_date) >= @from_date LIMIT 20",
	parameters: [
		{
			name: "customer_id",
			source: "session",
			type: "string",
			binding: "customer_id",
		},
		{
			name: "product_id",
			source: "caller",
			type: "string",
			required: true,
			maxLength: 64,
			format: "identifier",
		},
		{ name: "from_date", source: "caller", type: "date", required: true },
	],
	columns: [
		{ name: "transaction_id", type: "string", classification: "financial" },
		{
			name: "transaction_date",
			type: "timestamp",
			classification: "financial",
		},
		{ name: "amount", type: "float64", classification: "financial" },
		{ name: "response_code", type: "int64", classification: "financial" },
	],
	relations: [],
	allowedRoles: ["customer"],
	maxRows: 20,
	maximumBytesBilled: 500_000_000,
};

const parameters = {
	customer_id: "customer-1",
	product_id: "product-1",
	from_date: "2026-01-01",
};

const goodRow = {
	transaction_id: "t-1",
	// BigQueryTimestamp wraps its ISO string in `value`.
	transaction_date: { value: "2026-01-02T03:04:05.000Z" },
	amount: 10.5,
	response_code: 0,
	// Not declared: must never reach the evidence.
	fraud_score: 0.9,
};

function fakeClient(
	overrides: Partial<{
		rows: unknown[];
		bytes: number | null;
		schema: { name: string; type: string }[] | null;
		failWith: unknown;
	}> = {},
) {
	const jobs: Parameters<BigQueryClientLike["createQueryJob"]>[0][] = [];
	const client: BigQueryClientLike = {
		async createQueryJob(options) {
			jobs.push(options);
			if (overrides.failWith !== undefined) {
				throw overrides.failWith;
			}
			return {
				jobId: "job-1",
				schema: overrides.schema ?? null,
				totalBytesProcessed: overrides.bytes ?? 1000,
				getRows: async () => ({
					rows: (overrides.rows ?? [goodRow]) as Record<string, unknown>[],
					totalBytesProcessed: overrides.bytes ?? 1000,
				}),
			};
		},
	};
	return { client, jobs };
}

function executor(client: BigQueryClientLike) {
	return new BigQueryQueryExecutor({
		client,
		location: "us-central1",
		jobTimeoutMs: 5000,
		now: () => 0,
	});
}

describe("BigQueryQueryExecutor", () => {
	test("runs a cost-capped, parameterized job and projects declared columns", async () => {
		const { client, jobs } = fakeClient();
		const result = await executor(client).execute({
			entry,
			parameters,
			traceId: "trace-1",
		});

		expect(result).toEqual({
			status: "ready",
			rows: [
				{
					transaction_id: "t-1",
					transaction_date: "2026-01-02T03:04:05.000Z",
					amount: 10.5,
					response_code: 0,
				},
			],
			jobId: "job-1",
			bytesProcessed: 1000,
			durationMs: 0,
		});
		const [job] = jobs;
		expect(job).toMatchObject({
			query: entry.sql,
			params: parameters,
			types: {
				customer_id: "STRING",
				product_id: "STRING",
				from_date: "DATE",
			},
			location: "us-central1",
			maximumBytesBilled: "500000000",
			jobTimeoutMs: 5000,
			useLegacySql: false,
		});
		expect(job).not.toHaveProperty("defaultDataset");
		expect(job?.labels.query_id).toBe("recent_transactions");
		// The raw trace id must not become a label.
		expect(JSON.stringify(job?.labels)).not.toContain("trace-1");
	});

	test("rejects missing, undeclared or mistyped parameters before calling BigQuery", async () => {
		const { client, jobs } = fakeClient();
		const run = (values: Record<string, string | number | boolean>) =>
			executor(client).execute({ entry, parameters: values, traceId: "t" });

		const { from_date: _removed, ...missing } = parameters;
		for (const values of [
			missing,
			{ ...parameters, extra: "x" },
			{ ...parameters, product_id: 7 },
			{ ...parameters, from_date: "01/02/2026" },
		]) {
			expect(await run(values)).toEqual({
				status: "failed",
				reasonCode: "query_invalid_parameters",
			});
		}
		expect(jobs).toHaveLength(0);
	});

	test("fails closed when the result is larger than maxRows", async () => {
		const { client } = fakeClient({
			rows: Array.from({ length: entry.maxRows + 1 }, () => goodRow),
		});

		expect(
			await executor(client).execute({ entry, parameters, traceId: "t" }),
		).toEqual({ status: "failed", reasonCode: "query_row_limit_exceeded" });
	});

	test("fails closed when a declared column is missing or mistyped", async () => {
		for (const rows of [
			[{ transaction_id: "t-1" }],
			[{ ...goodRow, amount: "10.5" }],
		]) {
			const { client } = fakeClient({ rows });
			expect(
				await executor(client).execute({ entry, parameters, traceId: "t" }),
			).toEqual({
				status: "failed",
				reasonCode: "query_result_shape_mismatch",
			});
		}
	});

	test("maps provider errors to closed codes without leaking the message", async () => {
		const cases: [unknown, string][] = [
			[
				{
					errors: [{ reason: "bytesBilledLimitExceeded" }],
					message: "SELECT secret",
				},
				"query_cost_limit_exceeded",
			],
			[{ errors: [{ reason: "timeout" }] }, "query_timeout"],
			[new Error("SELECT * FROM secret"), "query_failed"],
		];
		for (const [failWith, reasonCode] of cases) {
			const { client } = fakeClient({ failWith });
			const result = await executor(client).execute({
				entry,
				parameters,
				traceId: "t",
			});

			expect(result).toEqual({ status: "failed", reasonCode } as never);
			expect(JSON.stringify(result)).not.toContain("secret");
		}
	});

	test("dry run reads only metadata and sends sample parameters", async () => {
		const { client, jobs } = fakeClient({
			bytes: 123,
			schema: [{ name: "transaction_id", type: "STRING" }],
		});
		const result = await executor(client).dryRun({ entry });

		expect(result).toEqual({
			status: "ready",
			bytesProcessed: 123,
			schema: [{ name: "transaction_id", type: "STRING" }],
		});
		expect(jobs[0]).toMatchObject({ dryRun: true });
	});
});

describe("wrapBigQuery", () => {
	// Stands in for the SDK client; only the calls the wrapper makes are modeled.
	function sdkDouble() {
		const received: { params: Record<string, unknown> }[] = [];
		const client = {
			date: (value: string) => ({ wrapped: "date", value }),
			createQueryJob: async (options: { params: Record<string, unknown> }) => {
				received.push(options);
				return [
					{
						id: "job-1",
						metadata: {
							statistics: {
								query: {
									totalBytesProcessed: "123",
									schema: { fields: [{ name: "a", type: "STRING" }] },
								},
							},
						},
						getQueryResults: async () => [[{ a: "x" }], null, {}],
					},
				];
			},
		};
		return { client, received };
	}

	test("wraps DATE parameters, which the SDK mis-binds as plain strings", async () => {
		const { client, received } = sdkDouble();
		const wrapped = wrapBigQuery(client as never);

		await wrapped.createQueryJob({
			query: "unused",
			params: { customer_id: "c-1", from_date: "2026-01-01", limit: 5 },
			types: { customer_id: "STRING", from_date: "DATE", limit: "INT64" },
			location: "us-central1",
			maximumBytesBilled: "1",
			jobTimeoutMs: 1000,
			labels: {},
			useLegacySql: false,
		});

		expect(received[0]?.params).toEqual({
			customer_id: "c-1",
			from_date: { wrapped: "date", value: "2026-01-01" },
			limit: 5,
		});
	});

	test("reports the job id, estimated bytes and output schema", async () => {
		const { client } = sdkDouble();
		const job = await wrapBigQuery(client as never).createQueryJob({
			query: "unused",
			params: {},
			types: {},
			location: "us-central1",
			maximumBytesBilled: "1",
			jobTimeoutMs: 1000,
			labels: {},
			useLegacySql: false,
		});

		expect(job).toMatchObject({
			jobId: "job-1",
			totalBytesProcessed: 123,
			schema: [{ name: "a", type: "STRING" }],
		});
		expect(await job.getRows(1)).toEqual({
			rows: [{ a: "x" }],
			totalBytesProcessed: null,
		});
	});
});

describe("dry run check", () => {
	const schema = [
		{ name: "transaction_id", type: "STRING" },
		{ name: "transaction_date", type: "TIMESTAMP" },
		{ name: "amount", type: "FLOAT" },
		{ name: "response_code", type: "INTEGER" },
	];
	const ready = (
		overrides: Partial<{ schema: typeof schema; bytes: number | null }> = {},
	) =>
		({
			status: "ready",
			bytesProcessed: overrides.bytes === undefined ? 1000 : overrides.bytes,
			schema: overrides.schema ?? schema,
		}) as const;

	test("accepts a matching schema within budget, with legacy type names", () => {
		expect(checkDryRun(entry, ready())).toEqual({ valid: true });
	});

	test("rejects extra, missing or retyped columns", () => {
		expect(
			checkDryRun(
				entry,
				ready({ schema: [...schema, { name: "x", type: "STRING" }] }),
			),
		).toEqual({ valid: false, rule: "schema_column_mismatch" });
		expect(checkDryRun(entry, ready({ schema: schema.slice(1) }))).toEqual({
			valid: false,
			rule: "schema_column_mismatch",
		});
		expect(
			checkDryRun(
				entry,
				ready({
					schema: schema.map((field) =>
						field.name === "amount" ? { ...field, type: "STRING" } : field,
					),
				}),
			),
		).toEqual({ valid: false, rule: "schema_type_mismatch" });
	});

	test("rejects unknown or over-budget byte estimates", () => {
		expect(checkDryRun(entry, ready({ bytes: null }))).toEqual({
			valid: false,
			rule: "bytes_unknown",
		});
		expect(
			checkDryRun(entry, ready({ bytes: entry.maximumBytesBilled + 1 })),
		).toEqual({ valid: false, rule: "bytes_over_budget" });
	});
});

describe("row projection and the in-memory executor", () => {
	test("projects only declared columns and keeps nulls", () => {
		expect(
			projectRows(entry.columns, [
				{
					...goodRow,
					transaction_date: "2026-01-02T00:00:00.000Z",
					amount: null,
				},
			]),
		).toEqual([
			{
				transaction_id: "t-1",
				transaction_date: "2026-01-02T00:00:00.000Z",
				amount: null,
				response_code: 0,
			},
		]);
	});

	test("records the bound parameters and fails closed on an unknown query", async () => {
		const double = new InMemoryStructuredQueryExecutor(
			new Map([
				[
					"recent_transactions@v1",
					() => [{ ...goodRow, transaction_date: "2026-01-02T00:00:00.000Z" }],
				],
			]),
		);

		const ok = await double.execute({ entry, parameters, traceId: "t" });
		const unknown = await double.execute({
			entry: { ...entry, queryId: "other" },
			parameters,
			traceId: "t",
		});

		expect(ok.status).toBe("ready");
		expect(unknown).toEqual({ status: "failed", reasonCode: "query_failed" });
		expect(double.calls[0]?.parameters.customer_id).toBe("customer-1");
	});
});
