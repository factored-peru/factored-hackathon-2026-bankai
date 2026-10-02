import type { BudgetTracker } from "../budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "../pipeline-contracts.js";
import type { AgentRouteHandler } from "../route-stage.js";

export class RejectRouteHandler implements AgentRouteHandler {
	readonly route = "reject" as const;

	async execute(
		input: AuthorizedDecisionContext,
		_budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		if (input.route.route !== "reject") {
			return { status: "failed", reasonCode: "route_handler_mismatch" };
		}
		return { status: "denied", reasonCode: input.route.reasonCode };
	}
}
