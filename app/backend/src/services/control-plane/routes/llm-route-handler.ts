import type { BudgetTracker } from "../budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "../pipeline-contracts.js";
import type { AgentRouteHandler } from "../route-stage.js";

export class LlmRouteHandler implements AgentRouteHandler {
	readonly route = "llm" as const;

	async execute(
		input: AuthorizedDecisionContext,
		_budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		if (input.route.route !== "llm") {
			return { status: "failed", reasonCode: "route_handler_mismatch" };
		}
		return input.route.legacyResponse === undefined
			? { status: "ready", payload: { kind: "llm" } }
			: {
					status: "ready",
					payload: {
						kind: "legacy_response",
						response: input.route.legacyResponse,
					},
				};
	}
}
