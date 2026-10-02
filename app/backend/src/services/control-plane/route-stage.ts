import type { BudgetTracker } from "./budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "./pipeline-contracts.js";

export interface AgentRouteHandler {
	readonly route: AuthorizedDecisionContext["route"]["route"];
	execute(
		input: AuthorizedDecisionContext,
		budget: BudgetTracker,
	): Promise<RouteExecutionResult>;
}

export class AgentRouteStage {
	private readonly handlers: ReadonlyMap<
		AuthorizedDecisionContext["route"]["route"],
		AgentRouteHandler
	>;

	constructor(handlers: AgentRouteHandler[]) {
		const entries = handlers.map(
			(handler) => [handler.route, handler] as const,
		);
		if (new Set(entries.map(([route]) => route)).size !== entries.length) {
			throw new Error("Duplicate agent route handler");
		}
		this.handlers = new Map(entries);
	}

	async execute(
		input: AuthorizedDecisionContext,
		budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		const handler = this.handlers.get(input.route.route);
		if (!handler) {
			return { status: "failed", reasonCode: "unsupported_model_route" };
		}
		return handler.execute(input, budget);
	}
}
