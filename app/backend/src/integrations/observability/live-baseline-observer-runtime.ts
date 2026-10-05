import type { Env } from "../../config/env.js";
import {
	BaselineRunEvaluationObserver,
	LIVE_BASELINE_MATRIX_VERSION,
	type LiveDeliveryFailure,
} from "../../services/evaluation/baseline-run-evaluation-observer.js";
import { createTraceCorrelator } from "../../services/observability/trace-correlator.js";
import type { BigQueryInsertClientLike } from "../bigquery/bigquery-evaluation-result-sink.js";
import {
	createEvaluationResultSink,
	type EvaluationSinkSettings,
} from "../bigquery/evaluation-result-sink-runtime.js";
import {
	createTelemetryRuntime,
	type TelemetryRuntimeOptions,
	type TelemetrySettings,
} from "./otel-telemetry-runtime.js";

export type LiveBaselineObserverSettings = TelemetrySettings &
	EvaluationSinkSettings &
	Pick<Env, "CHAT_PIPELINE">;

export type LiveBaselineObserverRuntime = Readonly<{
	observer: BaselineRunEvaluationObserver;
	/** Which channels are on, so startup can say so instead of staying silent. */
	channels: Readonly<{ spans: boolean; rows: boolean }>;
	/** Delivers anything queued and releases the exporter; call on server close. */
	shutdown(): Promise<void>;
}>;

/**
 * Composes the live telemetry of the baseline chat: spans to Langfuse and rows
 * to BigQuery, each only when configured. Returns `null` when the pipeline is
 * not the baseline or neither channel is enabled, so nothing is created and no
 * network is touched.
 */
export async function createLiveBaselineObserver(
	settings: LiveBaselineObserverSettings,
	overrides: {
		telemetry?: Pick<TelemetryRuntimeOptions, "exporter" | "ambientEnv">;
		sinkClient?: BigQueryInsertClientLike;
		/** Receives a closed code whenever a run's delivery fails. */
		onFailure?: (reason: LiveDeliveryFailure) => void;
	} = {},
): Promise<LiveBaselineObserverRuntime | null> {
	if (settings.CHAT_PIPELINE !== "baseline") {
		return null;
	}
	const runtime = createTelemetryRuntime(settings, {
		matrixVersion: LIVE_BASELINE_MATRIX_VERSION,
		...overrides.telemetry,
	});
	const sink = await createEvaluationResultSink(
		settings,
		overrides.sinkClient === undefined ? {} : { client: overrides.sinkClient },
	);
	if (runtime === null && sink === null) {
		return null;
	}
	const correlate =
		settings.TELEMETRY_CORRELATOR_KEY.length >= 16
			? createTraceCorrelator(settings.TELEMETRY_CORRELATOR_KEY)
			: undefined;
	const observer = new BaselineRunEvaluationObserver({
		...(runtime === null
			? {}
			: {
					telemetry: runtime.evaluationTelemetry,
					flush: () => runtime.flush(),
				}),
		...(sink === null ? {} : { sink }),
		...(correlate === undefined ? {} : { correlate }),
		...(overrides.onFailure === undefined
			? {}
			: { onFailure: overrides.onFailure }),
	});
	return {
		observer,
		channels: { spans: runtime !== null, rows: sink !== null },
		shutdown: async () => {
			await runtime?.shutdown().catch(() => undefined);
		},
	};
}
