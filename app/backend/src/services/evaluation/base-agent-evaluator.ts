import { trace } from "@opentelemetry/api";
import type { Evaluation, EvaluationRun, Evaluator } from "./contracts.js";

/** Deterministic baseline; results are safe OTel metadata, never content. */
export class BaseAgentEvaluator implements Evaluator {
	evaluate(run: EvaluationRun): readonly Evaluation[] {
		const evaluations = [
			metric("policy_allowed", run.policyAllowed, "policy denied execution"),
			metric("within_budget", !run.budgetExceeded, "agent budget exceeded"),
			metric(
				"response_sanitized",
				!run.responseContainsSensitiveContent,
				"response contains sensitive content",
			),
		];
		const span = trace
			.getTracer("bankai.evaluation")
			.startSpan("agent.evaluate");
		for (const evaluation of evaluations) {
			span.setAttribute(`eval.${evaluation.metric}.score`, evaluation.score);
			span.setAttribute(`eval.${evaluation.metric}.passed`, evaluation.passed);
		}
		span.end();
		return evaluations;
	}
}

function metric(
	metricName: string,
	passed: boolean,
	reason: string,
): Evaluation {
	return passed
		? { metric: metricName, score: 1, passed: true }
		: { metric: metricName, score: 0, passed: false, reason };
}
