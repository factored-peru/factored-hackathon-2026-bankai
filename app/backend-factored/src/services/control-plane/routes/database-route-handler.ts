import type { ToolExecutionService } from "../../tools/tool-execution-service.js";
import type { BudgetTracker } from "../budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "../pipeline-contracts.js";
import type { AgentRouteHandler } from "../route-stage.js";

export class DatabaseRouteHandler implements AgentRouteHandler {
	readonly route = "database" as const;

	constructor(private readonly tools: ToolExecutionService) {}

	async execute(
		input: AuthorizedDecisionContext,
		budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		if (input.route.route !== "database") {
			return { status: "failed", reasonCode: "route_handler_mismatch" };
		}
		budget.consume("toolCalls");
		const result = await this.tools.execute({
			call: input.route.call,
			context: {
				session: input.session,
				traceId: input.request.traceId,
				workflowId: null,
				decisionId: input.policy.decisionId,
			},
			policyDecision: input.policy,
			approvalSatisfied: false,
		});
		if (result.status !== "succeeded") {
			return { status: "failed", reasonCode: result.reasonCode };
		}
		return {
			status: "ready",
			payload: { kind: "database", value: result.output },
		};
	}
}
