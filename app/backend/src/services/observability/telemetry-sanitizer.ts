import { ZodError } from "zod";
import {
	type EvaluationResultRecord,
	evaluationResultRecordSchema,
	evaluationResultRecordSchemaVersion,
} from "../../domain/observability/evaluation-result-record.js";
import {
	TelemetryAttributeError,
	type TelemetryAttributes,
	validateMetricAttributes,
	validateSpanAttributes,
} from "../../domain/observability/telemetry-attributes.js";
import type {
	EvaluationContext,
	EvaluationReport,
	EvaluationResult,
} from "../evaluation/contracts.js";
import type { TraceCorrelator } from "./trace-correlator.js";

/**
 * The single place where evaluation outcomes become telemetry. Spans, metric
 * attributes and BigQuery records are all built here and validated against the
 * closed contract before anything is handed to an exporter. Every function
 * throws `TelemetryAttributeError` on a breach and never echoes a value.
 */

/** Attributes of the one span emitted per evaluated fixture. */
export function evaluationSpanAttributes(
	context: EvaluationContext,
	report: EvaluationReport,
	correlate: TraceCorrelator,
	matrixVersion?: string,
): TelemetryAttributes {
	const attributes: Record<string, unknown> = {
		"bankai.span": "evaluation",
		"bankai.correlator": correlate(context.traceId),
		"eval.fixture_id": context.fixtureId,
		"eval.route": context.route,
		"eval.policy_version": context.policyVersion,
		"eval.catalog_version": context.catalogVersion ?? "none",
		"eval.matrix_version": matrixVersion,
	};
	// Facts of a live run. A golden fixture carries none of them, so its span is
	// unchanged. Only counts, a duration and a closed error code: never content.
	if (context.pipeline !== undefined) {
		attributes["bankai.pipeline"] = context.pipeline;
	}
	if (context.durationMs !== undefined) {
		attributes["bankai.latency_ms"] = Math.round(context.durationMs);
	}
	if (context.modelCallCount !== undefined) {
		attributes["bankai.model_calls"] = context.modelCallCount;
	}
	if (context.retrievalAttemptCount !== undefined) {
		attributes["bankai.retrieval_attempts"] = context.retrievalAttemptCount;
	}
	if (context.retrievalSuccessCount !== undefined) {
		attributes["bankai.retrieval_successes"] = context.retrievalSuccessCount;
	}
	if (context.errorCode !== undefined) {
		attributes["bankai.outcome"] =
			context.errorCode === null ? "completed" : "failed";
		if (context.errorCode !== null) {
			attributes["bankai.error_code"] = context.errorCode;
		}
	}
	for (const result of report.results) {
		attributes[`eval.${result.metric}.score`] = result.score;
		attributes[`eval.${result.metric}.label`] = result.label;
		attributes[`eval.${result.metric}.reason_code`] =
			result.reasonCode ?? "none";
	}
	return validateSpanAttributes(attributes);
}

/** Low-cardinality attributes for one result's OTel metric data point. */
export function evaluationMetricAttributes(
	context: EvaluationContext,
	result: EvaluationResult,
): TelemetryAttributes {
	return validateMetricAttributes({
		"bankai.route": context.route,
		"bankai.pipeline": context.pipeline,
		"eval.metric": result.metric,
		"eval.label": result.label,
		"eval.evaluator": result.evaluator,
		"eval.evaluator_version": result.evaluatorVersion,
	});
}

export type EvaluationRecordRun = Readonly<{
	runId: string;
	matrixVersion: string;
	recordedAt: Date;
	/** Without a correlator key the record's `correlator` column is null. */
	correlate?: TraceCorrelator;
}>;

/** One validated BigQuery record per result of the fixture's report. */
export function evaluationResultRecords(
	context: EvaluationContext,
	report: EvaluationReport,
	run: EvaluationRecordRun,
): readonly EvaluationResultRecord[] {
	return report.results.map((result) => {
		try {
			return evaluationResultRecordSchema.parse({
				schemaVersion: evaluationResultRecordSchemaVersion,
				runId: run.runId,
				matrixVersion: run.matrixVersion,
				fixtureId: context.fixtureId,
				route: context.route,
				metric: result.metric,
				score: result.score,
				passed: result.passed,
				label: result.label,
				reasonCode: result.reasonCode,
				evaluator: result.evaluator,
				evaluatorVersion: result.evaluatorVersion,
				mode: result.mode,
				gate: report.gate,
				policyVersion: context.policyVersion,
				catalogVersion: context.catalogVersion,
				correlator: run.correlate?.(context.traceId) ?? null,
				recordedAt: run.recordedAt.toISOString(),
			});
		} catch (error) {
			if (error instanceof ZodError) {
				const issue = error.issues[0];
				const key =
					issue?.code === "unrecognized_keys"
						? (issue.keys[0] ?? "")
						: String(issue?.path[0] ?? "");
				throw new TelemetryAttributeError("invalid_value", key);
			}
			throw error;
		}
	});
}
