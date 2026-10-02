import type { BudgetTracker } from "../budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "../pipeline-contracts.js";
import type { AgentRouteHandler } from "../route-stage.js";

export class OutOfDomainRouteHandler implements AgentRouteHandler {
	readonly route = "out_of_domain" as const;

	async execute(
		input: AuthorizedDecisionContext,
		_budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		if (input.route.route !== "out_of_domain") {
			return { status: "failed", reasonCode: "route_handler_mismatch" };
		}
		return {
			status: "ready",
			payload: { kind: "out_of_domain", responseKey: input.route.responseKey },
		};
	}
}
