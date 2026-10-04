import type {
	EvaluationContext,
	EvaluationResult,
	RouteEvaluator,
} from "./contracts.js";

/**
 * Labels baseline behavior rather than treating missing controls as a pass for
 * the governed pipeline. It can be added to EvaluationRunner for comparisons.
 */
export class BaselineChatEvaluator implements RouteEvaluator {
	readonly route = "llm" as const;
	readonly name = "baseline_chat";
	readonly version = "v1";

	evaluate(context: EvaluationContext): readonly EvaluationResult[] {
		if (context.pipeline !== "baseline") {
			return [this.skipped("baseline_not_selected")];
		}
		const ungated =
			context.controlPlaneInvoked === false &&
			context.privacyGateInvoked === false &&
			context.guardrailInvoked === false;
		return [
			this.result(
				"baseline_ungated_shape",
				ungated,
				"baseline_gate_was_invoked",
			),
			this.result(
				"baseline_model_completed",
				context.errorCode === null,
				"baseline_model_error",
			),
			this.result(
				"baseline_duration_recorded",
				typeof context.durationMs === "number" && context.durationMs >= 0,
				"baseline_duration_missing",
			),
			this.result(
				"baseline_retrieval_attempts_recorded",
				typeof context.retrievalAttemptCount === "number" &&
					context.retrievalAttemptCount >= 0,
				"baseline_retrieval_attempts_missing",
			),
		];
	}

	private result(
		metric: string,
		passed: boolean,
		reasonCode: string,
	): EvaluationResult {
		return {
			metric,
			score: passed ? 1 : 0,
			passed,
			label: passed ? "pass" : "fail",
			reasonCode: passed ? null : reasonCode,
			evaluator: this.name,
			evaluatorVersion: this.version,
			mode: "deterministic",
		};
	}

	private skipped(reasonCode: string): EvaluationResult {
		return {
			metric: "baseline_ungated_shape",
			score: 0,
			passed: true,
			label: "skipped",
			reasonCode,
			evaluator: this.name,
			evaluatorVersion: this.version,
			mode: "deterministic",
		};
	}
}
