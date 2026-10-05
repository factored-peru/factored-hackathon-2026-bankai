import { randomUUID } from "node:crypto";
import type { TraceCorrelator } from "../observability/trace-correlator.js";
import type {
	BaselineRunMeasurement,
	BaselineRunObserver,
} from "../ports/baseline-chat.js";
import type {
	EvaluationResultSink,
	EvaluationSinkFailure,
} from "../ports/evaluation-result-sink.js";
import type { EvaluationTelemetry } from "../ports/evaluation-telemetry.js";
import { BaselineChatEvaluator } from "./baseline-chat-evaluator.js";
import type { EvaluationContext, Evaluator } from "./contracts.js";
import { persistEvaluationRun } from "./evaluation-run-persistence.js";
import { EvaluationRunner } from "./evaluation-runner.js";

/** Rows and spans of live baseline runs carry these, so they are easy to filter. */
export const LIVE_BASELINE_MATRIX_VERSION = "live-baseline-v1";
export const LIVE_BASELINE_FIXTURE_ID = "live-baseline";
const LIVE_BASELINE_POLICY_VERSION = "baseline-v1";

/**
 * A slow or unreachable backend must not stall a conversation turn, so the
 * delivery of one run is capped. Cloud Run only gives a request CPU while it is
 * open, so delivery is awaited inside the turn instead of left to a timer.
 */
const DEFAULT_DELIVERY_TIMEOUT_MS = 2_000;

/**
 * The shared evaluators judge gates (guardrail, policy, tenant isolation) that
 * the ungated baseline never invokes. Running them on a live run would report
 * passes for checks that did not happen, so only the baseline evaluator runs.
 */
const noSharedEvaluator: Evaluator = { evaluate: () => [] };

/**
 * Turns the content-free measurement of one baseline run into an evaluation
 * context. The fields only the shared evaluators read are neutral placeholders
 * and are never evaluated; nothing here carries a prompt, an answer or a row.
 */
export function baselineMeasurementToContext(
	measurement: BaselineRunMeasurement,
): EvaluationContext {
	return {
		traceId: measurement.traceId,
		fixtureId: LIVE_BASELINE_FIXTURE_ID,
		route: "llm",
		expectedRoute: "llm",
		trajectory: [],
		expectedTrajectory: [],
		policyAllowed: true,
		budgetExceeded: false,
		evidenceVersion: null,
		catalogLoaded: false,
		catalogLoadedBeforeSpecializedJev: false,
		tenantIsolated: true,
		guardrailPassed: true,
		responseContainsSensitiveContent: false,
		resultVerified: false,
		policyVersion: LIVE_BASELINE_POLICY_VERSION,
		catalogVersion: null,
		pipeline: measurement.pipeline,
		durationMs: measurement.durationMs,
		modelCallCount: measurement.modelCallCount,
		controlPlaneInvoked: measurement.controlPlaneInvoked,
		privacyGateInvoked: measurement.privacyGateInvoked,
		guardrailInvoked: measurement.guardrailInvoked,
		retrievalInvoked: measurement.retrievalInvoked,
		retrievalAttemptCount: measurement.retrievalAttemptCount,
		retrievalSuccessCount: measurement.retrievalSuccessCount,
		errorCode: measurement.errorCode,
	};
}

/** Closed codes only: a provider message could echo what must not leave. */
export type LiveDeliveryFailure =
	| EvaluationSinkFailure
	| "export_failed"
	| "delivery_timeout"
	| "observer_error";

export type BaselineEvaluationObserverOptions = Readonly<{
	telemetry?: EvaluationTelemetry;
	sink?: EvaluationResultSink;
	correlate?: TraceCorrelator;
	/** Delivers whatever is still queued; awaited with the sink under one cap. */
	flush?: () => Promise<void>;
	deliveryTimeoutMs?: number;
	now?: () => Date;
	/** Told, with a closed code, whenever a run's delivery fails; keep it cheap. */
	onFailure?: (reason: LiveDeliveryFailure) => void;
}>;

/**
 * Records every baseline run as one span and its evaluation rows (ADR 0012 and
 * 0015). It never throws, so a telemetry failure cannot affect the chat; a
 * failure is counted and reported to `onFailure` with a closed code.
 */
export class BaselineRunEvaluationObserver implements BaselineRunObserver {
	/** Runs whose delivery failed or timed out; never shown to the user. */
	failedDeliveries = 0;
	private readonly runner: EvaluationRunner;

	constructor(private readonly options: BaselineEvaluationObserverOptions) {
		this.runner = new EvaluationRunner(
			noSharedEvaluator,
			[new BaselineChatEvaluator()],
			options.telemetry,
		);
	}

	async record(measurement: BaselineRunMeasurement): Promise<void> {
		try {
			const context = baselineMeasurementToContext(measurement);
			// The span is emitted here, before the flush below delivers it.
			const report = this.runner.run(context);
			const deliveries: Promise<LiveDeliveryFailure | null>[] = [];
			const { sink, flush } = this.options;
			if (sink !== undefined) {
				deliveries.push(
					persistEvaluationRun([{ context, report }], {
						sink,
						run: {
							runId: `live-${randomUUID().slice(0, 12)}`,
							matrixVersion: LIVE_BASELINE_MATRIX_VERSION,
							recordedAt: (this.options.now ?? (() => new Date()))(),
							...(this.options.correlate === undefined
								? {}
								: { correlate: this.options.correlate }),
						},
					}).then(
						(result) => (result.status === "ok" ? null : result.reason),
						(): LiveDeliveryFailure => "sink_unavailable",
					),
				);
			}
			if (flush !== undefined) {
				deliveries.push(
					flush().then(
						() => null,
						(): LiveDeliveryFailure => "export_failed",
					),
				);
			}
			const failure = await deliverWithin(
				deliveries,
				this.options.deliveryTimeoutMs ?? DEFAULT_DELIVERY_TIMEOUT_MS,
			);
			if (failure !== null) {
				this.reportFailure(failure);
			}
		} catch {
			this.reportFailure("observer_error");
		}
	}

	private reportFailure(reason: LiveDeliveryFailure): void {
		this.failedDeliveries += 1;
		try {
			this.options.onFailure?.(reason);
		} catch {
			// Reporting a failure must not become one.
		}
	}
}

/** The first failure, or null if every delivery succeeded before the cap. */
async function deliverWithin(
	deliveries: readonly Promise<LiveDeliveryFailure | null>[],
	timeoutMs: number,
): Promise<LiveDeliveryFailure | null> {
	let timer: ReturnType<typeof setTimeout> | undefined;
	const timeout = new Promise<LiveDeliveryFailure>((resolve) => {
		timer = setTimeout(() => resolve("delivery_timeout"), timeoutMs);
	});
	try {
		const all = Promise.all(deliveries).then(
			(results) => results.find((result) => result !== null) ?? null,
		);
		return await Promise.race([all, timeout]);
	} finally {
		clearTimeout(timer);
	}
}
