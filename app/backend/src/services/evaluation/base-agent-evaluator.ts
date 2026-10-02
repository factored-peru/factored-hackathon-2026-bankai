import { trace } from "@opentelemetry/api";
import type {
	EvaluationContext,
	EvaluationResult,
	Evaluator,
} from "./contracts.js";

/** Deterministic baseline; results are safe OTel metadata, never content. */
export class BaseAgentEvaluator implements Evaluator {
	readonly name: string = "base_agent";
	readonly version: string = "v1";

	evaluate(context: EvaluationContext): readonly EvaluationResult[] {
		const results = [
			this.result(
				"route_correct",
				context.route === context.expectedRoute,
				"route_mismatch",
			),
			this.result(
				"trajectory_in_order",
				sameTrajectory(context),
				"trajectory_mismatch",
			),
			this.result(
				"policy_allowed",
				context.policyAllowed,
				"policy_denied_execution",
			),
			this.result(
				"within_budget",
				!context.budgetExceeded,
				"agent_budget_exceeded",
			),
			this.result(
				"tenant_isolated",
				context.tenantIsolated,
				"tenant_isolation_failed",
			),
			this.result(
				"guardrail_passed",
				context.guardrailPassed,
				"guardrail_failed",
			),
			this.result(
				"response_sanitized",
				!context.responseContainsSensitiveContent,
				"response_sensitive_content",
			),
			this.result(
				"result_verified",
				context.resultVerified,
				"unverified_result",
			),
		];
		const span = trace
			.getTracer("bankai.evaluation")
			.startSpan("agent.evaluate");
		span.setAttribute("eval.fixture_id", context.fixtureId);
		span.setAttribute("eval.route", context.route);
		span.setAttribute("eval.policy_version", context.policyVersion);
		span.setAttribute("eval.catalog_version", context.catalogVersion ?? "none");
		for (const result of results) {
			span.setAttribute(`eval.${result.metric}.score`, result.score);
			span.setAttribute(`eval.${result.metric}.label`, result.label);
			span.setAttribute(
				`eval.${result.metric}.reason_code`,
				result.reasonCode ?? "none",
			);
		}
		span.end();
		return results;
	}

	protected result(
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
}

function sameTrajectory(context: EvaluationContext): boolean {
	return (
		context.trajectory.length === context.expectedTrajectory.length &&
		context.trajectory.every(
			(step, index) =>
				step.name === context.expectedTrajectory[index]?.name &&
				step.route === context.expectedTrajectory[index]?.route,
		)
	);
}
