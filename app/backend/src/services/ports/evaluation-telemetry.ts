import type {
	EvaluationContext,
	EvaluationReport,
} from "../evaluation/contracts.js";

/**
 * Receives the sanitized outcome of one evaluated fixture (ADR 0012 / 0015).
 * Implementations validate against the telemetry contract and must not throw:
 * a telemetry failure never changes an evaluation or authorizes anything.
 */
export interface EvaluationTelemetry {
	record(context: EvaluationContext, report: EvaluationReport): void;
}
