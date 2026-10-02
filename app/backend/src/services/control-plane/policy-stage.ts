import { policyDecisionSchema } from "../../domain/control/contracts.js";
import type { PolicyEngine } from "../ports/control.js";
import type { WorkflowService } from "../workflows/workflow-service.js";
import type {
	DecisionStageContext,
	PolicyStageResult,
} from "./pipeline-contracts.js";

const clarificationQuestions = {
	clarify_domain: "¿Puedes precisar qué necesitas sobre soporte bancario?",
	clarify_account: "¿Qué cuenta autorizada deseas consultar?",
	clarify_period: "¿Qué periodo autorizado deseas consultar?",
} as const;

export class AgentPolicyStage {
	constructor(
		private readonly policy: PolicyEngine,
		private readonly workflows: WorkflowService,
	) {}

	async requestClarification(input: DecisionStageContext): Promise<{
		workflowId: string;
		clarificationId: string;
		question: string;
	}> {
		if (input.route.route !== "clarify") {
			throw new Error("Clarification requested for a non-clarify route");
		}
		const pending = await this.workflows.requestClarification({
			session: input.session,
			threadId: input.request.threadId,
			question: clarificationQuestions[input.route.question],
			decisionState: input.state,
		});
		return {
			...pending,
			question: clarificationQuestions[input.route.question],
		};
	}

	async execute(input: DecisionStageContext): Promise<PolicyStageResult> {
		const policy = policyDecisionSchema.parse(
			await this.policy.evaluate({
				session: input.session,
				state: input.state,
				modelDecision: input.modelDecision,
				signal: input.signal,
			}),
		);

		if (policy.outcome === "DENY") {
			return {
				status: "denied",
				decisionId: policy.decisionId,
				reasonCode: policy.reasons[0] ?? "policy_denied",
				policy,
			};
		}

		if (
			input.signal?.domain === "out_of_domain" &&
			input.route.route !== "out_of_domain"
		) {
			return {
				status: "denied",
				decisionId: policy.decisionId,
				reasonCode: "domain_route_conflict",
				policy,
			};
		}

		if (policy.outcome === "REQUIRE_APPROVAL") {
			if (input.route.route !== "database") {
				return { status: "failed", reasonCode: "approval_without_action" };
			}
			const pending = await this.workflows.requestApproval({
				session: input.session,
				threadId: input.request.threadId,
				call: input.route.call,
				decisionState: input.state,
				policyDecision: policy,
			});
			return {
				status: "pending_approval",
				decisionId: policy.decisionId,
				workflowId: pending.workflowId,
				approvalId: pending.approvalId,
				policy,
			};
		}

		return { status: "ready", context: { ...input, policy } };
	}
}
