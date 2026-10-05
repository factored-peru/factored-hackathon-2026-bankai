import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import type { EvaluationResultRecord } from "../src/domain/observability/evaluation-result-record.js";
import {
	BigQueryEvaluationResultSink,
	type BigQueryInsertClientLike,
	type EvaluationInsertRow,
	evaluationRecordToRow,
	wrapBigQueryTable,
} from "../src/integrations/bigquery/bigquery-evaluation-result-sink.js";
import { createEvaluationResultSink } from "../src/integrations/bigquery/evaluation-result-sink-runtime.js";
import { InMemoryEvaluationResultSink } from "../src/integrations/memory/in-memory-evaluation-result-sink.js";
import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import { EvaluationRunner } from "../src/services/evaluation/evaluation-runner.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";
import { evaluationResultRecords } from "../src/services/observability/telemetry-sanitizer.js";
import { createTraceCorrelator } from "../src/services/observability/trace-correlator.js";
import { evaluationGoldens } from "./fixtures/evaluation-goldens.js";

const runner = new EvaluationRunner(new BaseAgentEvaluator(), [
	new StructuredRagEvaluator(),
	new KnowledgeGraphRagEvaluator(),
]);
const run = {
	runId: "run-20261004-0001",
	matrixVersion: "p0-v1",
	recordedAt: new Date("2026-10-04T12:00:00.000Z"),
	correlate: createTraceCorrelator("test-correlation-key-0001"),
};
const records: readonly EvaluationResultRecord[] = evaluationGoldens.flatMap(
	(context) => evaluationResultRecords(context, runner.run(context), run),
);

type SchemaColumn = { name: string; mode: "REQUIRED" | "NULLABLE" };
const schema: SchemaColumn[] = JSON.parse(
	readFileSync(
		new URL(
			"../../../deploy/terraform/modules/runtime/evaluation_results_schema.json",
			import.meta.url,
		),
		"utf8",
	),
);

function recordingClient(failOn?: { call: number; error: Error }) {
	const calls: EvaluationInsertRow[][] = [];
	const client: BigQueryInsertClientLike = {
		async insertRows(rows) {
			calls.push([...rows]);
			if (failOn !== undefined && calls.length === failOn.call) {
				throw failOn.error;
			}
		},
	};
	return { client, calls };
}

describe("evaluation record rows", () => {
	test("columns match the Terraform table schema exactly", () => {
		const row = evaluationRecordToRow(records[0] as EvaluationResultRecord);
		expect(Object.keys(row.json).sort()).toEqual(
			schema.map((column) => column.name).sort(),
		);
	});

	test("REQUIRED columns are never null across the whole golden set", () => {
		const required = schema
			.filter((column) => column.mode === "REQUIRED")
			.map((column) => column.name);
		for (const record of records) {
			const { json } = evaluationRecordToRow(record);
			for (const name of required) {
				expect(json[name]).not.toBeNull();
				expect(json[name]).not.toBeUndefined();
			}
		}
	});

	test("insert ID is deterministic and unique per fixture, metric and evaluator", () => {
		const ids = records.map((record) => evaluationRecordToRow(record).insertId);
		expect(new Set(ids).size).toBe(ids.length);
		const first = records[0] as EvaluationResultRecord;
		expect(ids[0]).toBe(
			`${run.runId}:${first.fixtureId}:${first.route}:${first.metric}:${first.evaluator}`,
		);
	});

	test("the golden set reuses fixture IDs across routes, so the route is in the key", () => {
		const fixtureIds = new Set(
			evaluationGoldens.map((fixture) => fixture.fixtureId),
		);
		expect(fixtureIds.size).toBeLessThan(evaluationGoldens.length);
		const withoutRoute = new Set(
			records.map(
				(record) => `${record.fixtureId}:${record.metric}:${record.evaluator}`,
			),
		);
		expect(withoutRoute.size).toBeLessThan(records.length);
	});

	test("rows carry no trace ID, prompt or other content", () => {
		const serialized = JSON.stringify(records.map(evaluationRecordToRow));
		for (const fixture of evaluationGoldens) {
			expect(serialized).not.toContain(fixture.traceId);
		}
		expect(serialized).not.toMatch(/"(prompt|response|content|sql|trace_id)"/);
	});
});

describe("BigQuery evaluation result sink", () => {
	test("writes every golden result", async () => {
		const { client, calls } = recordingClient();
		const result = await new BigQueryEvaluationResultSink(client).write(
			records,
		);
		expect(result).toEqual({ status: "ok", written: records.length });
		expect(calls.flat()).toHaveLength(records.length);
	});

	test("splits into batches of at most 500 rows", async () => {
		const { client, calls } = recordingClient();
		const many = Array.from(
			{ length: 1200 },
			() => records[0],
		) as EvaluationResultRecord[];
		const result = await new BigQueryEvaluationResultSink(client).write(many);
		expect(calls.map((batch) => batch.length)).toEqual([500, 500, 200]);
		expect(result).toEqual({ status: "ok", written: 1200 });
	});

	test("one invalid record writes nothing at all", async () => {
		const { client, calls } = recordingClient();
		const bad = { ...(records[0] as EvaluationResultRecord), score: 7 };
		const result = await new BigQueryEvaluationResultSink(client).write([
			...records,
			bad,
		]);
		expect(calls).toHaveLength(0);
		expect(result).toEqual({
			status: "failed",
			reason: "sink_invalid_record",
			attempted: records.length + 1,
			written: 0,
		});
	});

	test("a record with an extra field is refused", async () => {
		const { client, calls } = recordingClient();
		const leaky = {
			...(records[0] as EvaluationResultRecord),
			prompt: "leak",
		} as unknown as EvaluationResultRecord;
		const result = await new BigQueryEvaluationResultSink(client).write([
			leaky,
		]);
		expect(result).toMatchObject({
			status: "failed",
			reason: "sink_invalid_record",
		});
		expect(calls).toHaveLength(0);
	});

	test("a rejected row reports a closed code and the rows already written", async () => {
		const secretRow = "customer value that must not be echoed";
		const partial = Object.assign(new Error(`bad row: ${secretRow}`), {
			name: "PartialFailureError",
		});
		const { client } = recordingClient({ call: 2, error: partial });
		const many = Array.from(
			{ length: 700 },
			() => records[0],
		) as EvaluationResultRecord[];
		const result = await new BigQueryEvaluationResultSink(client).write(many);
		expect(result).toEqual({
			status: "failed",
			reason: "sink_rejected_rows",
			attempted: 700,
			written: 500,
		});
		expect(JSON.stringify(result)).not.toContain(secretRow);
	});

	test("tells the operator what to fix without echoing the provider message", async () => {
		const withStatus = (message: string, extra: object) =>
			Object.assign(new Error(message), extra);
		const cases: Array<[Error, string]> = [
			[
				withStatus("Not found: Table p:d.t SECRET-TABLE-DETAIL", { code: 404 }),
				"sink_not_found",
			],
			[
				withStatus("denied SECRET-TABLE-DETAIL", {
					code: 403,
					errors: [{ reason: "accessDenied" }],
				}),
				"sink_permission_denied",
			],
			[
				withStatus("Streaming insert is not allowed in the free tier", {
					code: 403,
					errors: [{ reason: "accessDenied" }],
				}),
				"sink_billing_required",
			],
			[
				withStatus("x SECRET-TABLE-DETAIL", {
					code: 403,
					errors: [{ reason: "billingNotEnabled" }],
				}),
				"sink_billing_required",
			],
			[
				withStatus(
					"Could not load the default credentials. SECRET-TABLE-DETAIL",
					{},
				),
				"sink_auth_failed",
			],
			[
				withStatus("unauthenticated SECRET-TABLE-DETAIL", { code: 401 }),
				"sink_auth_failed",
			],
			[
				withStatus("boom SECRET-TABLE-DETAIL", { code: 503 }),
				"sink_unavailable",
			],
		];
		for (const [error, expected] of cases) {
			const { client } = recordingClient({ call: 1, error });
			const result = await new BigQueryEvaluationResultSink(client).write(
				records,
			);
			expect(result).toMatchObject({ status: "failed", reason: expected });
			expect(JSON.stringify(result)).not.toContain("SECRET-TABLE-DETAIL");
		}
	});

	test("a non-Error rejection is reported as unavailable", async () => {
		const client: BigQueryInsertClientLike = {
			async insertRows() {
				throw "plain string with SECRET-TABLE-DETAIL";
			},
		};
		const result = await new BigQueryEvaluationResultSink(client).write(
			records,
		);
		expect(result).toMatchObject({
			status: "failed",
			reason: "sink_unavailable",
		});
		expect(JSON.stringify(result)).not.toContain("SECRET-TABLE-DETAIL");
	});

	test("any other failure is reported as unavailable without its message", async () => {
		const { client } = recordingClient({
			call: 1,
			error: new Error("503 backend error with project internals"),
		});
		const result = await new BigQueryEvaluationResultSink(client).write(
			records,
		);
		expect(result).toMatchObject({
			status: "failed",
			reason: "sink_unavailable",
			written: 0,
		});
		expect(JSON.stringify(result)).not.toContain("internals");
	});

	test("never throws, even for an empty batch", async () => {
		const { client, calls } = recordingClient();
		expect(await new BigQueryEvaluationResultSink(client).write([])).toEqual({
			status: "ok",
			written: 0,
		});
		expect(calls).toHaveLength(0);
	});
});

describe("BigQuery table adapter", () => {
	test("inserts raw rows and never skips or strips anything", async () => {
		const seen: unknown[] = [];
		const client = wrapBigQueryTable({
			async insert(rows, options) {
				seen.push({ rows, options });
				return undefined;
			},
		});
		const rows = [evaluationRecordToRow(records[0] as EvaluationResultRecord)];
		await client.insertRows(rows);
		expect(seen).toEqual([
			{
				rows,
				options: {
					raw: true,
					skipInvalidRows: false,
					ignoreUnknownValues: false,
				},
			},
		]);
	});
});

describe("evaluation sink runtime", () => {
	const settings = {
		BIGQUERY_ENABLED: true,
		BIGQUERY_EVAL_DATASET: "bankai_evaluation",
		BIGQUERY_EVAL_TABLE: "evaluation_results",
		GOOGLE_CLOUD_PROJECT: "factored-hackathon",
		GOOGLE_CLOUD_LOCATION: "us-central1",
	};

	test("is off, and creates nothing, without an evaluation dataset", async () => {
		expect(
			await createEvaluationResultSink({
				...settings,
				BIGQUERY_EVAL_DATASET: "",
			}),
		).toBeNull();
	});

	test("refuses an evaluation dataset when BigQuery is disabled", async () => {
		await expect(
			createEvaluationResultSink({ ...settings, BIGQUERY_ENABLED: false }),
		).rejects.toThrow("evaluation_sink_requires_bigquery");
	});

	test("builds a working sink over an injected client", async () => {
		const { client, calls } = recordingClient();
		const sink = await createEvaluationResultSink(settings, { client });
		if (sink === null) throw new Error("sink expected");
		expect(await sink.write(records)).toEqual({
			status: "ok",
			written: records.length,
		});
		expect(calls.flat()).toHaveLength(records.length);
	});
});

describe("in-memory evaluation sink", () => {
	test("keeps one row per insert ID, like a deduping store", async () => {
		const sink = new InMemoryEvaluationResultSink();
		await sink.write(records);
		await sink.write(records);
		expect(sink.records).toHaveLength(records.length);
	});

	test("can simulate a failing store", async () => {
		const sink = new InMemoryEvaluationResultSink("sink_unavailable");
		expect(await sink.write(records)).toMatchObject({
			status: "failed",
			reason: "sink_unavailable",
		});
		expect(sink.records).toHaveLength(0);
	});
});
