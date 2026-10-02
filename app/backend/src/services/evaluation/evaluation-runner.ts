import type {
	EvaluationContext,
	EvaluationReport,
	Evaluator,
	RouteEvaluator,
} from "./contracts.js";

/** Reports every score; P0 does not block a release on quality thresholds. */
export class EvaluationRunner {
	constructor(
		private readonly baselineEvaluator: Evaluator,
		private readonly routeEvaluators: readonly RouteEvaluator[],
	) {}

	run(context: EvaluationContext): EvaluationReport {
		const routeResults = this.routeEvaluators
			.filter((evaluator) => evaluator.route === context.route)
			.flatMap((evaluator) => evaluator.evaluate(context));
		return {
			fixtureId: context.fixtureId,
			gate: "informational",
			results: [...this.baselineEvaluator.evaluate(context), ...routeResults],
		};
	}
}
