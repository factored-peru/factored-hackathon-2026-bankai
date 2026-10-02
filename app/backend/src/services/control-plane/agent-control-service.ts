import type {
	AgentRunResult,
	DecisionSignal,
} from "../../domain/control/contracts.js";
import type { SafeAuditEvent } from "../../domain/observability/audit-event.js";
import type { SessionContext } from "../../domain/session.js";
import type { AuditSink } from "../ports/observability.js";
import { BudgetExceededError, BudgetTracker } from "./budget-tracker.js";
import type { AgentDecisionStage } from "./decision-stage.js";
import type { AgentInputStage } from "./input-stage.js";
import type { AgentRequest } from "./pipeline-contracts.js";
import type { AgentPolicyStage } from "./policy-stage.js";
import type { AgentResponseStage } from "./response-stage.js";
import type { AgentRouteStage } from "./route-stage.js";
import { stableHash } from "./stable-hash.js";

export class AgentControlService {
	constructor(
		private readonly inputStage: AgentInputStage,
		private readonly decisionStage: AgentDecisionStage,
		private readonly policyStage: AgentPolicyStage,
		private readonly routeStage: AgentRouteStage,
		private readonly responseStage: AgentResponseStage,
		private readonly audit: AuditSink,
		private readonly now: () => Date = () => new Date(),
	) {}

	async run(input: AgentRequest): Promise<AgentRunResult> {
		const budget = new BudgetTracker(input.budget);
		try {
			const inputResult = await this.inputStage.execute(input, budget);
			if ("status" in inputResult) {
				return inputResult;
			}

			const decisionResult = await this.decisionStage.execute(
				inputResult,
				budget,
			);
			if ("status" in decisionResult) {
				return decisionResult;
			}

			if (decisionResult.route.route === "out_of_domain") {
				const responseResult =
					await this.responseStage.executeOutOfDomain(decisionResult);
				if (responseResult.status === "completed") {
					await this.recordOutcome(
						inputResult.session,
						input.traceId,
						"completed",
						responseResult.decisionId,
						undefined,
						undefined,
						decisionResult.signal,
					);
				}
				return responseResult;
			}

			if (decisionResult.route.route === "clarify") {
				const pending =
					await this.policyStage.requestClarification(decisionResult);
				const decisionId = stableHash({
					traceId: input.traceId,
					domain: decisionResult.signal?.domain,
					question: decisionResult.route.question,
				});
				await this.recordOutcome(
					inputResult.session,
					input.traceId,
					"pending_clarification",
					decisionId,
					undefined,
					undefined,
					decisionResult.signal,
				);
				return {
					status: "pending_clarification",
					decisionId,
					workflowId: pending.workflowId,
					clarificationId: pending.clarificationId,
					question: pending.question,
				};
			}

			const policyResult = await this.policyStage.execute(decisionResult);
			if (policyResult.status === "denied") {
				await this.recordOutcome(
					inputResult.session,
					input.traceId,
					"policy_denied",
					policyResult.decisionId,
					policyResult.reasonCode,
					policyResult.policy,
					decisionResult.signal,
				);
				return policyResult;
			}
			if (policyResult.status === "pending_approval") {
				await this.recordOutcome(
					inputResult.session,
					input.traceId,
					"pending_approval",
					policyResult.decisionId,
					undefined,
					policyResult.policy,
					decisionResult.signal,
				);
				return policyResult;
			}
			if (policyResult.status === "failed") {
				return policyResult;
			}

			const routeResult = await this.routeStage.execute(
				policyResult.context,
				budget,
			);
			if (routeResult.status !== "ready") {
				if (routeResult.status === "pending_clarification") {
					await this.recordOutcome(
						inputResult.session,
						input.traceId,
						"pending_clarification",
						policyResult.context.policy.decisionId,
						undefined,
						policyResult.context.policy,
						decisionResult.signal,
					);
					return {
						status: "pending_clarification",
						decisionId: policyResult.context.policy.decisionId,
						workflowId: routeResult.workflowId,
						clarificationId: routeResult.clarificationId,
						question: routeResult.question,
					};
				}
				if (routeResult.status === "denied") {
					await this.recordOutcome(
						inputResult.session,
						input.traceId,
						"route_denied",
						policyResult.context.policy.decisionId,
						routeResult.reasonCode,
						policyResult.context.policy,
						decisionResult.signal,
					);
					return {
						status: "denied",
						decisionId: policyResult.context.policy.decisionId,
						reasonCode: routeResult.reasonCode,
					};
				}
				return {
					status: "failed",
					reasonCode: routeResult.reasonCode,
				};
			}

			const responseResult = await this.responseStage.execute(
				policyResult.context,
				routeResult,
				budget,
			);
			if (responseResult.status !== "completed") {
				return responseResult;
			}

			await this.recordOutcome(
				inputResult.session,
				input.traceId,
				"completed",
				responseResult.decisionId,
				undefined,
				policyResult.context.policy,
				decisionResult.signal,
			);
			return responseResult;
		} catch (error) {
			return {
				status: "failed",
				reasonCode:
					error instanceof BudgetExceededError
						? `budget_${error.counter}_exceeded`
						: "control_plane_failure",
			};
		}
	}

	private async recordOutcome(
		session: SessionContext,
		traceId: string,
		outcome: string,
		decisionId: string,
		reasonCode?: string,
		policy?: {
			policyId: string;
			policyVersion: string;
			riskLevel: SafeAuditEvent["riskLevel"];
		},
		signal?: DecisionSignal | null,
	): Promise<void> {
		const event: SafeAuditEvent = {
			event: "agent_control_decision",
			traceId,
			workflowId: null,
			decisionId,
			policyId: policy?.policyId ?? null,
			policyVersion: policy?.policyVersion ?? null,
			toolId: null,
			toolVersion: null,
			guardrailProvider: null,
			guardrailStatus: null,
			templateVersion: null,
			riskLevel: policy?.riskLevel ?? null,
			jevProvider: signal?.provider ?? null,
			jevModelVersion: signal?.modelVersion ?? null,
			domainDecision: signal?.domain ?? null,
			domainConfidence: signal?.domainConfidence ?? null,
			routeHint: signal?.routeHint ?? null,
			routeConfidence: signal?.routeConfidence ?? null,
			sessionHash: stableHash(session.sessionId),
			tenantHash: stableHash(session.tenantId),
			outcome: reasonCode ? `${outcome}:${reasonCode}` : outcome,
			occurredAt: this.now().toISOString(),
		};
		await this.audit.record(event);
	}
}
