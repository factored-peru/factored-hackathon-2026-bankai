import { describe, expect, test } from "bun:test";
import { ExportResultCode } from "@opentelemetry/core";
import type { ReadableSpan, SpanExporter } from "@opentelemetry/sdk-trace-base";
import {
	runAndEmitEvaluation,
	runEvaluationGoldenSet,
} from "../scripts/evaluate-goldens.js";
import { InMemoryEvaluationResultSink } from "../src/integrations/memory/in-memory-evaluation-result-sink.js";
import { createTelemetryRuntime } from "../src/integrations/observability/otel-telemetry-runtime.js";
import { createTraceCorrelator } from "../src/services/observability/trace-correlator.js";
import { evaluationGoldens } from "./fixtures/evaluation-goldens.js";

const settings = {
	OTEL_ENABLED: true,
	APP_ENV: "dev" as const,
	LANGFUSE_BASE_URL: "https://us.cloud.langfuse.com",
	LANGFUSE_PUBLIC_KEY: "pk-lf-test-public",
	LANGFUSE_SECRET_KEY: "sk-lf-test-secret",
	TELEMETRY_CORRELATOR_KEY: "correlator-key-0123456789",
};
const deps = {
	runId: "run-20261005-abcd1234",
	now: () => new Date("2026-10-05T12:00:00.000Z"),
	correlate: createTraceCorrelator(settings.TELEMETRY_CORRELATOR_KEY),
};

/** Keeps what it received after shutdown, unlike InMemorySpanExporter. */
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

function runtimeWith(exporter: SpanExporter) {
	const runtime = createTelemetryRuntime(settings, {
		exporter,
		matrixVersion: "p0-v1",
	});
	if (runtime === null) throw new Error("runtime expected");
	return runtime;
}

describe("evaluation emission", () => {
	test("sends one span per fixture and every result to BigQuery", async () => {
		const memory = recordingExporter();
		const sink = new InMemoryEvaluationResultSink();
		const { batch, emission } = await runAndEmitEvaluation({
			...deps,
			runtime: runtimeWith(memory.exporter),
			sink,
		});
		expect(emission).toEqual({
			ok: true,
			spans: { status: "sent", droppedSpans: 0 },
			bigquery: { status: "ok", written: batch.resultCount },
		});
		expect(memory.spans).toHaveLength(batch.fixtureCount);
		expect(sink.records).toHaveLength(batch.resultCount);
		for (const record of sink.records) {
			expect(record.runId).toBe(deps.runId);
			expect(record.recordedAt).toBe("2026-10-05T12:00:00.000Z");
			expect(record.correlator).toMatch(/^[a-f0-9]{32}$/);
		}
	});

	test("the span and the BigQuery row of a fixture share one correlator", async () => {
		const memory = recordingExporter();
		const sink = new InMemoryEvaluationResultSink();
		await runAndEmitEvaluation({
			...deps,
			runtime: runtimeWith(memory.exporter),
			sink,
		});
		const fromSpans = new Set<unknown>(
			memory.spans.map((span) => span.attributes["bankai.correlator"]),
		);
		const fromRows = new Set<unknown>(
			sink.records.map((record) => record.correlator),
		);
		expect(fromSpans.size).toBeGreaterThan(0);
		expect(fromRows).toEqual(fromSpans);
	});

	test("nothing it emits contains a raw trace ID or a key", async () => {
		const memory = recordingExporter();
		const sink = new InMemoryEvaluationResultSink();
		const { emission } = await runAndEmitEvaluation({
			...deps,
			runtime: runtimeWith(memory.exporter),
			sink,
		});
		const everything = JSON.stringify([
			memory.spans.map((span) => span.attributes),
			sink.records,
			emission,
		]);
		for (const fixture of evaluationGoldens) {
			expect(everything).not.toContain(fixture.traceId);
		}
		expect(everything).not.toContain(settings.LANGFUSE_SECRET_KEY);
		expect(everything).not.toContain(settings.TELEMETRY_CORRELATOR_KEY);
	});

	test("persistence alone works, and without a key the correlator is null", async () => {
		const sink = new InMemoryEvaluationResultSink();
		const { emission } = await runAndEmitEvaluation({
			runId: deps.runId,
			now: deps.now,
			runtime: null,
			sink,
		});
		expect(emission.ok).toBe(true);
		expect(emission.spans).toEqual({ status: "skipped" });
		expect(sink.records.every((record) => record.correlator === null)).toBe(
			true,
		);
	});

	test("telemetry alone works", async () => {
		const memory = recordingExporter();
		const { emission } = await runAndEmitEvaluation({
			...deps,
			runtime: runtimeWith(memory.exporter),
			sink: null,
		});
		expect(emission.ok).toBe(true);
		expect(emission.bigquery).toEqual({ status: "skipped" });
	});

	test("a failing store is an error but never alters the evaluation", async () => {
		const memory = recordingExporter();
		const { batch, emission } = await runAndEmitEvaluation({
			...deps,
			runtime: runtimeWith(memory.exporter),
			sink: new InMemoryEvaluationResultSink("sink_unavailable"),
		});
		expect(emission.ok).toBe(false);
		expect(emission.bigquery).toEqual({
			status: "failed",
			reason: "sink_unavailable",
			attempted: batch.resultCount,
			written: 0,
		});
		expect(emission.spans.status).toBe("sent");
		expect(batch.resultCount).toBe(runEvaluationGoldenSet().resultCount);
	});

	test("an exporter that fails is an error, not a silent success", async () => {
		const failing: SpanExporter = {
			export(_spans, done) {
				done({
					code: ExportResultCode.FAILED,
					error: new Error("401 body with sk-lf-leak"),
				});
			},
			shutdown: async () => undefined,
		};
		const { emission } = await runAndEmitEvaluation({
			...deps,
			runtime: runtimeWith(failing),
			sink: new InMemoryEvaluationResultSink(),
		});
		expect(emission.ok).toBe(false);
		expect(emission.spans.status).toBe("failed");
		expect(JSON.stringify(emission)).not.toContain("sk-lf-leak");
	});

	test("with nothing configured it sends nothing and is not ok", async () => {
		const { batch, emission } = await runAndEmitEvaluation({
			runId: deps.runId,
			now: deps.now,
			runtime: null,
			sink: null,
		});
		expect(emission).toEqual({
			ok: false,
			reason: "nothing_configured",
			spans: { status: "skipped" },
			bigquery: { status: "skipped" },
		});
		expect(batch.fixtureCount).toBe(evaluationGoldens.length);
	});
});

describe("eval:run command", () => {
	const script = new URL("../scripts/evaluate-goldens.ts", import.meta.url)
		.pathname;
	const quiet = {
		...process.env,
		OTEL_ENABLED: "false",
		LANGFUSE_ENABLED: "false",
		BIGQUERY_EVAL_DATASET: "",
	};

	async function run(args: string[], env: Record<string, string | undefined>) {
		const child = Bun.spawn(
			["bun", script.replace(/^\/([A-Za-z]:)/, "$1"), ...args],
			{
				env: env as Record<string, string>,
				stdout: "pipe",
				stderr: "pipe",
			},
		);
		const [stdout, exitCode] = await Promise.all([
			new Response(child.stdout).text(),
			child.exited,
		]);
		return { stdout: stdout.trim(), exitCode };
	}

	test("without --emit the output and exit code are unchanged", async () => {
		const { reports: _reports, ...expected } = runEvaluationGoldenSet();
		const { stdout, exitCode } = await run([], quiet);
		expect(exitCode).toBe(0);
		expect(JSON.parse(stdout)).toEqual(expected);
		expect(stdout).not.toContain("emit");
	});

	test("--emit with nothing configured exits 1 and says so", async () => {
		const { stdout, exitCode } = await run(["--emit"], quiet);
		expect(exitCode).toBe(1);
		const printed = JSON.parse(stdout);
		expect(printed.emit).toEqual({
			ok: false,
			reason: "nothing_configured",
			spans: { status: "skipped" },
			bigquery: { status: "skipped" },
		});
		expect(printed.runId).toMatch(/^run-\d{8}-[a-f0-9]{8}$/);
	});

	test("--emit with a broken configuration exits 1 without echoing keys", async () => {
		const secret = "sk-lf-do-not-print";
		const { stdout, exitCode } = await run(["--emit"], {
			...quiet,
			OTEL_ENABLED: "true",
			LANGFUSE_ENABLED: "false",
			LANGFUSE_SECRET_KEY: secret,
		});
		expect(exitCode).toBe(1);
		expect(stdout).toContain("SVC-CORE-9017");
		expect(stdout).not.toContain(secret);
	});

	test("--emit refuses ambient OTLP variables without echoing their value", async () => {
		const { stdout, exitCode } = await run(["--emit"], {
			...quiet,
			OTEL_ENABLED: "true",
			LANGFUSE_ENABLED: "true",
			LANGFUSE_PUBLIC_KEY: "pk-lf-x",
			LANGFUSE_SECRET_KEY: "sk-lf-x",
			TELEMETRY_CORRELATOR_KEY: "correlator-key-0123456789",
			OTEL_EXPORTER_OTLP_HEADERS: "x-ambient=hidden-value",
		});
		expect(exitCode).toBe(1);
		expect(stdout).toContain(
			"telemetry_ambient_otlp_env_unsupported:OTEL_EXPORTER_OTLP_HEADERS",
		);
		expect(stdout).not.toContain("hidden-value");
	});
});
