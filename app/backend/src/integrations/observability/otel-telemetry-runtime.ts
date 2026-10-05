import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BasicTracerProvider,
	BatchSpanProcessor,
	type SpanExporter,
} from "@opentelemetry/sdk-trace-base";
import type { Env } from "../../config/env.js";
import { createTraceCorrelator } from "../../services/observability/trace-correlator.js";
import { buildLangfuseOtlpConfig } from "./langfuse-otlp-config.js";
import { OtelEvaluationTelemetry } from "./otel-evaluation-telemetry.js";
import { SanitizingSpanExporter } from "./sanitizing-span-exporter.js";

export type TelemetrySettings = Pick<
	Env,
	| "OTEL_ENABLED"
	| "APP_ENV"
	| "LANGFUSE_BASE_URL"
	| "LANGFUSE_PUBLIC_KEY"
	| "LANGFUSE_SECRET_KEY"
	| "TELEMETRY_CORRELATOR_KEY"
>;

export type TelemetryRuntimeOptions = Readonly<{
	matrixVersion?: string;
	/** Replaces the Langfuse OTLP exporter (tests); it is still sanitized. */
	exporter?: SpanExporter;
	/** Environment to inspect for ambient OTLP variables; defaults to the process. */
	ambientEnv?: Readonly<Record<string, string | undefined>>;
}>;

const AMBIENT_OTLP_VARIABLE = /^OTEL_EXPORTER_OTLP_[A-Z0-9_]+$/;

/**
 * The OTLP exporter silently merges `OTEL_EXPORTER_OTLP_*` variables (extra
 * headers, certificates, compression) into every request. Spans may only leave
 * as this module builds them, so such variables are refused outright. Only the
 * variable names are reported, never their values.
 */
function assertNoAmbientOtlpEnvironment(
	environment: Readonly<Record<string, string | undefined>>,
): void {
	const present = Object.entries(environment)
		.filter(
			([name, value]) =>
				AMBIENT_OTLP_VARIABLE.test(name) && (value ?? "").length > 0,
		)
		.map(([name]) => name)
		.sort();
	if (present.length > 0) {
		throw new Error(
			`telemetry_ambient_otlp_env_unsupported:${present.join(",")}`,
		);
	}
}

export type TelemetryRuntime = Readonly<{
	evaluationTelemetry: OtelEvaluationTelemetry;
	/** Exports whatever is queued; call before a short-lived process exits. */
	flush(): Promise<void>;
	shutdown(): Promise<void>;
	/** Spans dropped by the last-gate sanitizer; a non-zero value is a bug. */
	droppedSpans(): number;
}>;

/**
 * Composes the telemetry path: an isolated `TracerProvider` (never registered
 * globally, so nothing else can emit through it and no auto-instrumentation or
 * framework callback is attached) that batches spans through the sanitizing
 * exporter to Langfuse Cloud US over OTLP/HTTP. Returns `null` when telemetry
 * is disabled, so nothing is created and no network is touched.
 */
export function createTelemetryRuntime(
	settings: TelemetrySettings,
	options: TelemetryRuntimeOptions = {},
): TelemetryRuntime | null {
	if (!settings.OTEL_ENABLED) {
		return null;
	}
	assertNoAmbientOtlpEnvironment(options.ambientEnv ?? process.env);
	const target =
		options.exporter ??
		new OTLPTraceExporter({
			...buildLangfuseOtlpConfig(settings),
			timeoutMillis: 10_000,
		});
	const exporter = new SanitizingSpanExporter(target);
	const provider = new BasicTracerProvider({
		resource: resourceFromAttributes({
			"service.name": "bankai-backend",
			"deployment.environment.name": settings.APP_ENV,
		}),
		spanProcessors: [
			new BatchSpanProcessor(exporter, {
				maxQueueSize: 1024,
				maxExportBatchSize: 128,
				scheduledDelayMillis: 5_000,
				exportTimeoutMillis: 10_000,
			}),
		],
	});
	const evaluationTelemetry = new OtelEvaluationTelemetry({
		tracer: provider.getTracer("bankai.evaluation"),
		correlate: createTraceCorrelator(settings.TELEMETRY_CORRELATOR_KEY),
		...(options.matrixVersion === undefined
			? {}
			: { matrixVersion: options.matrixVersion }),
	});
	return {
		evaluationTelemetry,
		flush: () => provider.forceFlush(),
		shutdown: () => provider.shutdown(),
		droppedSpans: () => exporter.droppedSpans,
	};
}
