import type { WorkflowService } from "../../workflows/workflow-service.js";
import type { BudgetTracker } from "../budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "../pipeline-contracts.js";
import type { AgentRouteHandler } from "../route-stage.js";

const questions = {
	clarify_domain: "¿Puedes precisar qué necesitas sobre soporte bancario?",
	clarify_account: "¿Qué cuenta autorizada deseas consultar?",
	clarify_period: "¿Qué periodo autorizado deseas consultar?",
} as const;

export class ClarificationRouteHandler implements AgentRouteHandler {
	readonly route = "clarify" as const;

	constructor(private readonly workflows: WorkflowService) {}

	async execute(
		input: AuthorizedDecisionContext,
		_budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		if (input.route.route !== "clarify") {
			return { status: "failed", reasonCode: "route_handler_mismatch" };
		}
		const pending = await this.workflows.requestClarification({
			session: input.session,
			threadId: input.request.threadId,
			question: questions[input.route.question],
			decisionState: input.state,
			policyDecision: input.policy,
		});
		return {
			status: "pending_clarification",
			workflowId: pending.workflowId,
			clarificationId: pending.clarificationId,
			question: questions[input.route.question],
		};
	}
}
