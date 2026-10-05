import type { Counter, Meter, Tracer } from "@opentelemetry/api";
import type {
	EvaluationContext,
	EvaluationReport,
} from "../../services/evaluation/contracts.js";
import {
	evaluationMetricAttributes,
	evaluationSpanAttributes,
} from "../../services/observability/telemetry-sanitizer.js";
import type { TraceCorrelator } from "../../services/observability/trace-correlator.js";
import type { EvaluationTelemetry } from "../../services/ports/evaluation-telemetry.js";

export type OtelEvaluationTelemetryOptions = Readonly<{
	/** Tracer of an isolated provider; spans are created manually, never auto. */
	tracer: Tracer;
	correlate: TraceCorrelator;
	matrixVersion?: string;
	/** Optional: one low-cardinality counter point per evaluation result. */
	meter?: Meter;
}>;

/**
 * Emits one span per evaluated fixture (and optionally one metric point per
 * result) through OpenTelemetry. All attributes come from the sanitizer, so a
 * contract breach drops the whole fixture's telemetry instead of exporting a
 * partial or unvalidated span. It never throws (ADR 0012).
 */
export class OtelEvaluationTelemetry implements EvaluationTelemetry {
	/** Fixtures whose telemetry was dropped because it breached the contract. */
	droppedCount = 0;
	private readonly counter: Counter | null;

	constructor(private readonly options: OtelEvaluationTelemetryOptions) {
		this.counter =
			options.meter?.createCounter("bankai.evaluation.results", {
				description: "Evaluation results by metric, label and route",
			}) ?? null;
	}

	record(context: EvaluationContext, report: EvaluationReport): void {
		try {
			// Validate everything first: nothing is emitted if anything is invalid.
			const spanAttributes = evaluationSpanAttributes(
				context,
				report,
				this.options.correlate,
				this.options.matrixVersion,
			);
			const metricPoints = report.results.map((result) =>
				evaluationMetricAttributes(context, result),
			);
			const span = this.options.tracer.startSpan("evaluation");
			span.setAttributes(spanAttributes);
			span.end();
			for (const attributes of metricPoints) {
				this.counter?.add(1, attributes);
			}
		} catch {
			this.droppedCount += 1;
		}
	}
}
