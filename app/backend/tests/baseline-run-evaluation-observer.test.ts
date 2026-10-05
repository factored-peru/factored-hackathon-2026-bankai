import { describe, expect, test } from "bun:test";
import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import type { SessionContext } from "../src/domain/session.js";
import type {
	BigQueryInsertClientLike,
	EvaluationInsertRow,
} from "../src/integrations/bigquery/bigquery-evaluation-result-sink.js";
import { createLiveBaselineObserver } from "../src/integrations/observability/live-baseline-observer-runtime.js";
import { BaselineConversationRunner } from "../src/services/baseline/baseline-conversation-runner.js";
import {
	BaselineRunEvaluationObserver,
	baselineMeasurementToContext,
} from "../src/services/evaluation/baseline-run-evaluation-observer.js";
import {
	type BaselineContextTool,
	type BaselineRunMeasurement,
	baselineRetrievalToolName,
} from "../src/services/ports/baseline-chat.js";

const settings = {
	OTEL_ENABLED: true,
	APP_ENV: "staging" as const,
	LANGFUSE_BASE_URL: "https://us.cloud.langfuse.com",
	LANGFUSE_PUBLIC_KEY: "pk-lf-test-public",
	LANGFUSE_SECRET_KEY: "sk-lf-test-secret",
	TELEMETRY_CORRELATOR_KEY: "correlator-key-0123456789",
	BIGQUERY_ENABLED: true,
	BIGQUERY_EVAL_DATASET: "bankai_evaluation",
	BIGQUERY_EVAL_TABLE: "evaluation_results",
	GOOGLE_CLOUD_PROJECT: "factored-hackathon",
	GOOGLE_CLOUD_LOCATION: "us-central1",
	CHAT_PIPELINE: "baseline" as const,
};

const completed: BaselineRunMeasurement = {
	traceId: "trace-live-private-123",
	pipeline: "baseline",
	outcome: "completed",
	durationMs: 842.7,
	modelCallCount: 2,
	retrievalAttemptCount: 1,
	retrievalSuccessCount: 1,
	controlPlaneInvoked: false,
	privacyGateInvoked: false,
	guardrailInvoked: false,
	retrievalInvoked: true,
	errorCode: null,
};

const failed: BaselineRunMeasurement = {
	...completed,
	traceId: "trace-live-private-456",
	outcome: "failed",
	modelCallCount: 1,
	retrievalAttemptCount: 0,
	retrievalSuccessCount: 0,
	retrievalInvoked: false,
	errorCode: "baseline_model_failure",
};

function recordingExporter() {
	const spans: ReadableSpan[] = [];
	const exporter: SpanExporter = {
		export(batch, done) {
			spans.push(...batch);
			done({ code: ExportResultCode.SUCCESS });
		},
		shutdown: async () => undefined,
	};
	return { exporter, spans };
}

function recordingTable() {
	const rows: EvaluationInsertRow[] = [];
	const client: BigQueryInsertClientLike = {
		async insertRows(batch) {
			rows.push(...batch);
		},
	};
	return { client, rows };
}

async function wired() {
	const telemetry = recordingExporter();
	const table = recordingTable();
	const runtime = await createLiveBaselineObserver(settings, {
		telemetry: { exporter: telemetry.exporter, ambientEnv: {} },
		sinkClient: table.client,
	});
	if (runtime === null) throw new Error("runtime expected");
	return { runtime, spans: telemetry.spans, rows: table.rows };
}

describe("baseline run measurement as an evaluation context", () => {
	test("carries only facts and neutral placeholders, never content", () => {
		const context = baselineMeasurementToContext(completed);
		expect(context).toMatchObject({
			fixtureId: "live-baseline",
			route: "llm",
			pipeline: "baseline",
			durationMs: 842.7,
			modelCallCount: 2,
			retrievalAttemptCount: 1,
			errorCode: null,
		});
		expect(Object.keys(context)).not.toContain("message");
		expect(JSON.stringify(context)).not.toMatch(/prompt|answer|rows/i);
	});
});

describe("live baseline telemetry", () => {
	test("emits one span of the run's facts, labelled as the baseline", async () => {
		const { runtime, spans } = await wired();
		await runtime.observer.record(completed);
		expect(spans).toHaveLength(1);
		const span = spans[0] as ReadableSpan;
		expect(span.name).toBe("evaluation");
		expect(span.attributes).toMatchObject({
			"bankai.span": "evaluation",
			"bankai.pipeline": "baseline",
			"bankai.outcome": "completed",
			"bankai.latency_ms": 843,
			"bankai.model_calls": 2,
			"bankai.retrieval_attempts": 1,
			"bankai.retrieval_successes": 1,
			"eval.fixture_id": "live-baseline",
			"eval.matrix_version": "live-baseline-v1",
			"eval.route": "llm",
		});
		expect(span.resource.attributes["deployment.environment.name"]).toBe(
			"staging",
		);
		await runtime.shutdown();
	});

	test("only baseline metrics are judged; shared gates are not invented", async () => {
		const { runtime, spans } = await wired();
		await runtime.observer.record(completed);
		const keys = Object.keys((spans[0] as ReadableSpan).attributes);
		for (const metric of [
			"baseline_ungated_shape",
			"baseline_model_completed",
			"baseline_duration_recorded",
			"baseline_retrieval_attempts_recorded",
		]) {
			expect(keys).toContain(`eval.${metric}.score`);
		}
		for (const invented of [
			"guardrail_passed",
			"tenant_isolated",
			"policy_allowed",
			"route_correct",
			"result_verified",
		]) {
			expect(keys).not.toContain(`eval.${invented}.score`);
		}
		await runtime.shutdown();
	});

	test("a failed run reports a closed error code, not a message", async () => {
		const { runtime, spans, rows } = await wired();
		await runtime.observer.record(failed);
		const attributes = (spans[0] as ReadableSpan).attributes;
		expect(attributes["bankai.outcome"]).toBe("failed");
		expect(attributes["bankai.error_code"]).toBe("baseline_model_failure");
		expect(attributes["eval.baseline_model_completed.label"]).toBe("fail");
		expect(attributes["eval.baseline_model_completed.reason_code"]).toBe(
			"baseline_model_error",
		);
		const failedRow = rows.find(
			(row) => row.json.metric === "baseline_model_completed",
		);
		expect(failedRow?.json).toMatchObject({
			passed: false,
			label: "fail",
			reason_code: "baseline_model_error",
		});
		await runtime.shutdown();
	});

	test("BigQuery rows can be told apart from the golden set", async () => {
		const { runtime, rows } = await wired();
		await runtime.observer.record(completed);
		expect(rows).toHaveLength(4);
		for (const row of rows) {
			expect(row.json).toMatchObject({
				evaluator: "baseline_chat",
				matrix_version: "live-baseline-v1",
				fixture_id: "live-baseline",
				route: "llm",
				gate: "informational",
				policy_version: "baseline-v1",
			});
			expect(String(row.json.metric)).toStartWith("baseline_");
			expect(row.json.correlator).toMatch(/^[a-f0-9]{32}$/);
		}
		await runtime.shutdown();
	});

	test("every run gets its own rows, so none collide", async () => {
		const { runtime, rows } = await wired();
		await runtime.observer.record(completed);
		await runtime.observer.record(completed);
		const ids = rows.map((row) => row.insertId);
		expect(ids).toHaveLength(8);
		expect(new Set(ids).size).toBe(8);
		await runtime.shutdown();
	});

	test("neither the span nor the rows expose the raw trace ID or a key", async () => {
		const { runtime, spans, rows } = await wired();
		await runtime.observer.record(completed);
		await runtime.observer.record(failed);
		const everything = JSON.stringify([
			spans.map((span) => span.attributes),
			rows,
		]);
		expect(everything).not.toContain("trace-live-private");
		expect(everything).not.toContain(settings.TELEMETRY_CORRELATOR_KEY);
		expect(everything).not.toContain(settings.LANGFUSE_SECRET_KEY);
		await runtime.shutdown();
	});
});

describe("delivery never affects the chat", () => {
	function reported() {
		const seen: string[] = [];
		return { seen, onFailure: (reason: string) => seen.push(reason) };
	}

	test("a failing store is counted and reported by its closed code", async () => {
		const { seen, onFailure } = reported();
		const observer = new BaselineRunEvaluationObserver({
			sink: {
				async write() {
					return {
						status: "failed",
						reason: "sink_not_found",
						attempted: 4,
						written: 0,
					};
				},
			},
			onFailure,
		});
		await expect(observer.record(completed)).resolves.toBeUndefined();
		expect(observer.failedDeliveries).toBe(1);
		expect(seen).toEqual(["sink_not_found"]);
	});

	test("a store that throws is reported as unavailable, without its message", async () => {
		const { seen, onFailure } = reported();
		const observer = new BaselineRunEvaluationObserver({
			sink: {
				async write() {
					throw new Error("bigquery detail SECRET-STORE-DETAIL");
				},
			},
			onFailure,
		});
		await expect(observer.record(completed)).resolves.toBeUndefined();
		expect(seen).toEqual(["sink_unavailable"]);
		expect(JSON.stringify(seen)).not.toContain("SECRET-STORE-DETAIL");
	});

	test("a rejecting flush is reported as an export failure, without its message", async () => {
		const { seen, onFailure } = reported();
		const observer = new BaselineRunEvaluationObserver({
			flush: async () => {
				throw new Error("langfuse down with SECRET-EXPORT-DETAIL");
			},
			onFailure,
		});
		await expect(observer.record(completed)).resolves.toBeUndefined();
		expect(observer.failedDeliveries).toBe(1);
		expect(seen).toEqual(["export_failed"]);
		expect(JSON.stringify(seen)).not.toContain("SECRET-EXPORT-DETAIL");
	});

	test("a hanging backend cannot hold a turn beyond the cap", async () => {
		const { seen, onFailure } = reported();
		const observer = new BaselineRunEvaluationObserver({
			flush: () => new Promise<void>(() => undefined),
			deliveryTimeoutMs: 40,
			onFailure,
		});
		const startedAt = performance.now();
		await observer.record(completed);
		expect(performance.now() - startedAt).toBeLessThan(500);
		expect(observer.failedDeliveries).toBe(1);
		expect(seen).toEqual(["delivery_timeout"]);
	});

	test("a failure callback that throws cannot break the turn", async () => {
		const observer = new BaselineRunEvaluationObserver({
			flush: async () => {
				throw new Error("down");
			},
			onFailure: () => {
				throw new Error("logger exploded");
			},
		});
		await expect(observer.record(completed)).resolves.toBeUndefined();
		expect(observer.failedDeliveries).toBe(1);
	});

	test("a successful run reports nothing", async () => {
		const { seen, onFailure } = reported();
		const telemetry = recordingExporter();
		const table = recordingTable();
		const runtime = await createLiveBaselineObserver(settings, {
			telemetry: { exporter: telemetry.exporter, ambientEnv: {} },
			sinkClient: table.client,
			onFailure,
		});
		if (runtime === null) throw new Error("runtime expected");
		await runtime.observer.record(completed);
		expect(runtime.observer.failedDeliveries).toBe(0);
		expect(seen).toEqual([]);
		await runtime.shutdown();
	});

	test("the factory passes the failure callback through, with the store's closed code", async () => {
		const { seen, onFailure } = reported();
		const runtime = await createLiveBaselineObserver(
			{ ...settings, OTEL_ENABLED: false },
			{
				sinkClient: {
					async insertRows() {
						throw Object.assign(new Error("Not found: Table SECRET-TABLE"), {
							code: 404,
						});
					},
				},
				onFailure,
			},
		);
		if (runtime === null) throw new Error("runtime expected");
		await runtime.observer.record(completed);
		expect(seen).toEqual(["sink_not_found"]);
		expect(JSON.stringify(seen)).not.toContain("SECRET-TABLE");
	});
});

describe("with the real baseline runner", () => {
	const session: SessionContext = {
		sessionId: "session-private",
		userId: "user-private",
		tenantId: "tenant-private",
		roles: ["customer"],
		capabilities: [],
		scopes: [],
		sessionVersion: 1,
		createdAt: "2026-01-01T00:00:00.000Z",
		lastSeenAt: "2026-01-01T00:00:00.000Z",
		revokedAt: null,
		expiresAt: "2026-01-01T00:00:00.000Z",
	};
	const toolDefinition = {
		name: baselineRetrievalToolName,
		description: "retrieve customer context",
		parametersJsonSchema: { type: "object" },
	} as const;
	const tool: BaselineContextTool = {
		async describe() {
			return toolDefinition;
		},
		async retrieve() {
			return {
				status: "ready",
				queryId: "customer_products",
				queryVersion: "v1",
				rows: [{ product_id: "product-1", product_status: "active" }],
				rowCount: 1,
				bytesProcessed: 100,
				durationMs: 5,
				reasonCode: null,
			};
		},
	};

	function runner(observer: BaselineRunEvaluationObserver) {
		let now = 100;
		return new BaselineConversationRunner({
			model: {
				async begin() {
					return {
						kind: "tool_call" as const,
						call: {
							name: baselineRetrievalToolName,
							args: {
								queryId: "customer_products",
								version: "v1",
								parameters: {},
							},
							callId: "call-1",
						},
					};
				},
				async continue() {
					return { kind: "final", text: "Tu producto está activo." };
				},
			},
			tool,
			maxRetrievalAttempts: 2,
			observer,
			nowMs: () => now++,
		}).run;
	}

	async function chat(run: ReturnType<typeof runner>) {
		return run({
			session,
			threadId: "thread-private",
			traceId: "trace-real-run",
			message: "¿Cuál es el estado de mi producto?",
			onState: async () => undefined,
			onDelta: async () => undefined,
		});
	}

	test("a real turn produces a span and its rows without any content", async () => {
		const { runtime, spans, rows } = await wired();
		const result = await chat(runner(runtime.observer));
		expect(result).toMatchObject({ status: "completed" });
		expect(spans).toHaveLength(1);
		expect(rows).toHaveLength(4);
		const everything = JSON.stringify([
			spans.map((span) => span.attributes),
			rows,
		]);
		for (const content of [
			"estado de mi producto",
			"Tu producto",
			"product-1",
			"trace-real-run",
		]) {
			expect(everything).not.toContain(content);
		}
		await runtime.shutdown();
	});

	test("the answer is identical when telemetry and BigQuery are down", async () => {
		const healthy = await wired();
		const healthyResult = await chat(runner(healthy.runtime.observer));
		await healthy.runtime.shutdown();

		const broken = new BaselineRunEvaluationObserver({
			sink: {
				async write() {
					throw new Error("bigquery exploded");
				},
			},
			flush: async () => {
				throw new Error("langfuse exploded");
			},
		});
		const brokenResult = await chat(runner(broken));
		expect(brokenResult).toEqual(healthyResult);
		expect(broken.failedDeliveries).toBe(1);
	});
});

describe("live observer runtime", () => {
	test("does nothing unless the baseline pipeline is selected", async () => {
		expect(
			await createLiveBaselineObserver({ ...settings, CHAT_PIPELINE: "demo" }),
		).toBeNull();
	});

	test("does nothing when neither channel is enabled", async () => {
		expect(
			await createLiveBaselineObserver({
				...settings,
				OTEL_ENABLED: false,
				BIGQUERY_EVAL_DATASET: "",
			}),
		).toBeNull();
	});

	test("reports which channels are on, so startup can say so", async () => {
		const both = await createLiveBaselineObserver(settings, {
			telemetry: { exporter: recordingExporter().exporter, ambientEnv: {} },
			sinkClient: recordingTable().client,
		});
		expect(both?.channels).toEqual({ spans: true, rows: true });
		await both?.shutdown();
		const rowsOnly = await createLiveBaselineObserver(
			{ ...settings, OTEL_ENABLED: false },
			{ sinkClient: recordingTable().client },
		);
		expect(rowsOnly?.channels).toEqual({ spans: false, rows: true });
	});

	test("telemetry alone and persistence alone each work", async () => {
		const spansOnly = await createLiveBaselineObserver(
			{ ...settings, BIGQUERY_EVAL_DATASET: "" },
			{ telemetry: { exporter: recordingExporter().exporter, ambientEnv: {} } },
		);
		expect(spansOnly).not.toBeNull();
		await spansOnly?.shutdown();

		const table = recordingTable();
		const rowsOnly = await createLiveBaselineObserver(
			{ ...settings, OTEL_ENABLED: false },
			{ sinkClient: table.client },
		);
		await rowsOnly?.observer.record(completed);
		expect(table.rows).toHaveLength(4);
		expect(table.rows[0]?.json.correlator).toMatch(/^[a-f0-9]{32}$/);
	});

	test("without a correlator key the rows still persist, with a null correlator", async () => {
		const table = recordingTable();
		const runtime = await createLiveBaselineObserver(
			{ ...settings, OTEL_ENABLED: false, TELEMETRY_CORRELATOR_KEY: "" },
			{ sinkClient: table.client },
		);
		await runtime?.observer.record(completed);
		expect(table.rows).toHaveLength(4);
		expect(table.rows.every((row) => row.json.correlator === null)).toBe(true);
	});
});
