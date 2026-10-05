import type { EvaluationTelemetry } from "../ports/evaluation-telemetry.js";
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
		private readonly telemetry?: EvaluationTelemetry,
	) {}

	run(context: EvaluationContext): EvaluationReport {
		const routeResults = this.routeEvaluators
			.filter((evaluator) => evaluator.route === context.route)
			.flatMap((evaluator) => evaluator.evaluate(context));
		const report: EvaluationReport = {
			fixtureId: context.fixtureId,
			gate: "informational",
			results: [...this.baselineEvaluator.evaluate(context), ...routeResults],
		};
		try {
			this.telemetry?.record(context, report);
		} catch {
			// Telemetry is observational: its failure never alters an evaluation.
		}
		return report;
	}
}
