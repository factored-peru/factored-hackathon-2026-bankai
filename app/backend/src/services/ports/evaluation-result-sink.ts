import type { EvaluationResultRecord } from "../../domain/observability/evaluation-result-record.js";

/**
 * Closed failure codes; a provider message is never surfaced (ADR 0010). The
 * specific codes tell an operator what to fix without exposing that message.
 */
export type EvaluationSinkFailure =
	| "sink_invalid_record"
	| "sink_rejected_rows"
	| "sink_not_found"
	| "sink_permission_denied"
	| "sink_auth_failed"
	| "sink_billing_required"
	| "sink_unavailable";

export type EvaluationSinkResult =
	| Readonly<{ status: "ok"; written: number }>
	| Readonly<{
			status: "failed";
			reason: EvaluationSinkFailure;
			attempted: number;
			written: number;
	  }>;

/**
 * Durable home of sanitized evaluation results (ADR 0015). Implementations
 * never throw: a persistence failure is reported, never allowed to change an
 * evaluation or to grant anything.
 */
export interface EvaluationResultSink {
	write(
		records: readonly EvaluationResultRecord[],
	): Promise<EvaluationSinkResult>;
}
