import type { TelemetryRuntime } from "../src/integrations/observability/otel-telemetry-runtime.js";
import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import { persistEvaluationRun } from "../src/services/evaluation/evaluation-run-persistence.js";
import { EvaluationRunner } from "../src/services/evaluation/evaluation-runner.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";
import type { TraceCorrelator } from "../src/services/observability/trace-correlator.js";
import type { EvaluationResultSink } from "../src/services/ports/evaluation-result-sink.js";
import type { EvaluationTelemetry } from "../src/services/ports/evaluation-telemetry.js";
import { evaluationGoldens } from "../tests/fixtures/evaluation-goldens.js";
import { knowledgeGraphQuestionGoldens } from "../tests/fixtures/kg-question-goldens.js";

const MATRIX_VERSION = "p0-v1";

/** Evaluates every golden fixture, keeping each context for persistence. */
export function runEvaluationGoldenEntries(telemetry?: EvaluationTelemetry) {
	const runner = new EvaluationRunner(
		new BaseAgentEvaluator(),
		[new StructuredRagEvaluator(), new KnowledgeGraphRagEvaluator()],
		telemetry,
	);
	return evaluationGoldens.map((context) => ({
		context,
		report: runner.run(context),
	}));
}

/**
 * Runs the deterministic, content-free P0 evaluation matrix. The resulting
 * payload intentionally excludes trace IDs, prompts, answers, tool arguments,
 * retrieved rows and evidence text so it can flow to the OTel/BigQuery
 * adapters without widening ADR 0012's telemetry boundary.
 */
export function runEvaluationGoldenSet(
	options: { telemetry?: EvaluationTelemetry } = {},
) {
	const reports = runEvaluationGoldenEntries(options.telemetry).map(
		(entry) => entry.report,
	);
	return summarize(reports);
}

function summarize(
	reports: ReturnType<typeof runEvaluationGoldenEntries>[number]["report"][],
) {
	const results = reports.flatMap((report) => report.results);
	return {
		matrixVersion: MATRIX_VERSION,
		gate: "informational" as const,
		baseFixtureCount: 48,
		additionalKgCaseFixtureCount: knowledgeGraphQuestionGoldens.length,
		fixtureCount: reports.length,
		resultCount: results.length,
		passedCount: results.filter((result) => result.passed).length,
		failedCount: results.filter((result) => !result.passed).length,
		reports,
	};
}

export type SpanEmission =
	| Readonly<{ status: "skipped" }>
	| Readonly<{
			status: "sent" | "failed";
			droppedSpans: number;
			reason?: "export_failed" | "spans_dropped";
	  }>;

export type PersistenceEmission =
	| Readonly<{ status: "skipped" }>
	| Readonly<{ status: "ok"; written: number }>
	| Readonly<{
			status: "failed";
			reason: string;
			attempted: number;
			written: number;
	  }>;

/** Content-free outcome of `--emit`; `ok` decides the process exit code. */
export type EmissionSummary = Readonly<{
	ok: boolean;
	reason?: "nothing_configured";
	spans: SpanEmission;
	bigquery: PersistenceEmission;
}>;

export type EmissionDeps = Readonly<{
	runtime: TelemetryRuntime | null;
	sink: EvaluationResultSink | null;
	correlate?: TraceCorrelator;
	runId: string;
	now: () => Date;
}>;

/**
 * Runs the matrix and sends it to every configured channel. Each configured
 * channel must succeed for `ok`: someone who passes `--emit` asked for it, so a
 * silent failure would mislead. With nothing configured it sends nothing and
 * reports `nothing_configured`, also as not ok.
 */
export async function runAndEmitEvaluation(deps: EmissionDeps) {
	const entries = runEvaluationGoldenEntries(deps.runtime?.evaluationTelemetry);
	const batch = summarize(entries.map((entry) => entry.report));
	if (deps.runtime === null && deps.sink === null) {
		const emission: EmissionSummary = {
			ok: false,
			reason: "nothing_configured",
			spans: { status: "skipped" },
			bigquery: { status: "skipped" },
		};
		return { batch, emission };
	}

	const bigquery: PersistenceEmission =
		deps.sink === null
			? { status: "skipped" }
			: await persistToSink(deps.sink, entries, deps);
	const spans: SpanEmission =
		deps.runtime === null
			? { status: "skipped" }
			: await flushSpans(deps.runtime);

	const emission: EmissionSummary = {
		ok: spans.status !== "failed" && bigquery.status !== "failed",
		spans,
		bigquery,
	};
	return { batch, emission };
}

async function persistToSink(
	sink: EvaluationResultSink,
	entries: ReturnType<typeof runEvaluationGoldenEntries>,
	deps: EmissionDeps,
): Promise<PersistenceEmission> {
	const result = await persistEvaluationRun(entries, {
		sink,
		run: {
			runId: deps.runId,
			matrixVersion: MATRIX_VERSION,
			recordedAt: deps.now(),
			...(deps.correlate === undefined ? {} : { correlate: deps.correlate }),
		},
	});
	return result.status === "ok"
		? { status: "ok", written: result.written }
		: {
				status: "failed",
				reason: result.reason,
				attempted: result.attempted,
				written: result.written,
			};
}

async function flushSpans(runtime: TelemetryRuntime): Promise<SpanEmission> {
	try {
		await runtime.flush();
	} catch {
		await runtime.shutdown().catch(() => undefined);
		return {
			status: "failed",
			droppedSpans: dropped(runtime),
			reason: "export_failed",
		};
	}
	await runtime.shutdown().catch(() => undefined);
	const droppedSpans = dropped(runtime);
	return droppedSpans === 0
		? { status: "sent", droppedSpans }
		: { status: "failed", droppedSpans, reason: "spans_dropped" };
}

function dropped(runtime: TelemetryRuntime): number {
	return runtime.droppedSpans() + runtime.evaluationTelemetry.droppedCount;
}

/**
 * Error text is printed only when it is one of our own closed messages; a
 * library error could carry URLs, headers or values.
 */
function closedMessage(error: unknown): string {
	const message = error instanceof Error ? error.message : "";
	return /^(SVC-CORE-\d{4}: [A-Za-z0-9_=, ()./:-]+|telemetry_ambient_otlp_env_unsupported:[A-Z0-9_,]+|evaluation_sink_requires_bigquery|langfuse_[a-z_]+|trace_correlator_key_too_short)$/.test(
		message,
	)
		? message
		: "emit_unavailable";
}

async function emitFromEnvironment(): Promise<number> {
	const output = (value: unknown) =>
		process.stdout.write(`${JSON.stringify(value)}\n`);
	try {
		const { loadEnv } = await import("../src/config/env.js");
		const { createTelemetryRuntime } = await import(
			"../src/integrations/observability/otel-telemetry-runtime.js"
		);
		const { createEvaluationResultSink } = await import(
			"../src/integrations/bigquery/evaluation-result-sink-runtime.js"
		);
		const { createTraceCorrelator } = await import(
			"../src/services/observability/trace-correlator.js"
		);
		const settings = loadEnv();
		const runtime = createTelemetryRuntime(settings, {
			matrixVersion: MATRIX_VERSION,
		});
		const sink = await createEvaluationResultSink(settings);
		const correlate =
			settings.TELEMETRY_CORRELATOR_KEY.length >= 16
				? createTraceCorrelator(settings.TELEMETRY_CORRELATOR_KEY)
				: undefined;
		const now = new Date();
		const day = now.toISOString().slice(0, 10).replaceAll("-", "");
		const runId = `run-${day}-${crypto.randomUUID().slice(0, 8)}`;
		const { batch, emission } = await runAndEmitEvaluation({
			runtime,
			sink,
			...(correlate === undefined ? {} : { correlate }),
			runId,
			now: () => new Date(),
		});
		const { reports: _reports, ...summary } = batch;
		// The run ID is opaque; it is how a BigQuery row set is found afterwards.
		output({ ...summary, runId, emit: emission });
		return emission.ok ? 0 : 1;
	} catch (error) {
		output({ emit: { ok: false, reason: closedMessage(error) } });
		return 1;
	}
}

if (import.meta.main) {
	if (Bun.argv.includes("--emit")) {
		process.exitCode = await emitFromEnvironment();
	} else {
		const batch = runEvaluationGoldenSet();
		const { reports: _reports, ...summary } = batch;
		const output = Bun.argv.includes("--reports") ? batch : summary;
		process.stdout.write(`${JSON.stringify(output)}\n`);
	}
}
