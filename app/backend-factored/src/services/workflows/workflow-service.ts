import type {
	DecisionState,
	PolicyDecision,
} from "../../domain/control/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { ProposedToolCall } from "../../domain/tools/contracts.js";
import type {
	ActionProposal,
	Approval,
	Clarification,
} from "../../domain/workflows/contracts.js";
import { stableHash } from "../control-plane/stable-hash.js";
import type { DeidentifiedContent } from "../ports/privacy.js";
import type {
	ApprovalStore,
	ClarificationStore,
	Clock,
	IdGenerator,
	WorkflowStore,
} from "../ports/workflows.js";

export function actionProposalHash(input: {
	call: ProposedToolCall;
	policyVersion: string;
	sessionVersion: number;
}): string {
	return stableHash(input);
}

export type ResumeWorkflowResult =
	| Readonly<{ status: "ready"; proposal: ActionProposal }>
	| Readonly<{ status: "rejected"; reasonCode: string }>;

export class WorkflowService {
	constructor(
		private readonly workflows: WorkflowStore,
		private readonly approvals: ApprovalStore,
		private readonly ids: IdGenerator,
		private readonly clock: Clock,
		private readonly approvalTtlSeconds: number,
		private readonly clarifications?: ClarificationStore,
	) {}

	async requestClarification(input: {
		session: SessionContext;
		threadId: string;
		question: string;
		decisionState: DecisionState;
		policyDecision?: PolicyDecision;
	}): Promise<{
		workflowId: string;
		clarificationId: string;
	}> {
		if (!this.clarifications) {
			throw new Error("Clarification store is unavailable");
		}
		const workflowId = this.ids.next();
		const clarificationId = this.ids.next();
		const now = this.clock.now();
		const clarification: Clarification = {
			clarificationId,
			workflowId,
			threadId: input.threadId,
			userId: input.session.userId,
			tenantId: input.session.tenantId,
			sessionVersion: input.session.sessionVersion,
			question: input.question,
			decisionState: input.decisionState,
			policyDecision: input.policyDecision ?? null,
			expiresAt: new Date(
				now.getTime() + this.approvalTtlSeconds * 1000,
			).toISOString(),
			answeredAt: null,
			answer: null,
			status: "pending",
		};
		await this.clarifications.save(clarification);
		return { workflowId, clarificationId };
	}

	async answerClarification(input: {
		clarificationId: string;
		session: SessionContext;
		answer: DeidentifiedContent;
	}): Promise<boolean> {
		if (!this.clarifications) {
			return false;
		}
		const clarification = await this.clarifications.get(input.clarificationId);
		if (
			clarification?.status !== "pending" ||
			Date.parse(clarification.expiresAt) <= this.clock.now().getTime() ||
			clarification.userId !== input.session.userId ||
			clarification.tenantId !== input.session.tenantId ||
			clarification.sessionVersion !== input.session.sessionVersion
		) {
			return false;
		}
		return this.clarifications.answer(
			input.clarificationId,
			input.answer.content,
			this.clock.now().toISOString(),
		);
	}

	async requestApproval(input: {
		session: SessionContext;
		threadId: string;
		call: ProposedToolCall;
		decisionState: DecisionState;
		policyDecision: PolicyDecision;
	}): Promise<{ workflowId: string; approvalId: string }> {
		if (input.policyDecision.outcome !== "REQUIRE_APPROVAL") {
			throw new Error("Approval can only be requested by policy");
		}

		const workflowId = this.ids.next();
		const approvalId = this.ids.next();
		const now = this.clock.now();
		const actionHash = actionProposalHash({
			call: input.call,
			policyVersion: input.policyDecision.policyVersion,
			sessionVersion: input.session.sessionVersion,
		});
		const proposal: ActionProposal = {
			identity: {
				workflowId,
				threadId: input.threadId,
				userId: input.session.userId,
				tenantId: input.session.tenantId,
				sessionVersion: input.session.sessionVersion,
			},
			call: input.call,
			actionHash,
			policyDecision: input.policyDecision,
			decisionState: input.decisionState,
			status: "pending_approval",
			createdAt: now.toISOString(),
		};
		const approval: Approval = {
			approvalId,
			workflowId,
			actionHash,
			policyVersion: input.policyDecision.policyVersion,
			sessionVersion: input.session.sessionVersion,
			expiresAt: new Date(
				now.getTime() + this.approvalTtlSeconds * 1000,
			).toISOString(),
			consumedAt: null,
			decision: "pending",
		};

		await this.workflows.save(proposal);
		await this.approvals.save(approval);
		return { workflowId, approvalId };
	}

	async decideApproval(
		approvalId: string,
		decision: "approved" | "rejected",
	): Promise<boolean> {
		const approval = await this.approvals.get(approvalId);
		if (
			approval?.decision !== "pending" ||
			approval.consumedAt !== null ||
			Date.parse(approval.expiresAt) <= this.clock.now().getTime()
		) {
			return false;
		}
		const decided = await this.approvals.decide(approvalId, decision);
		if (!decided) {
			return false;
		}
		if (decision === "rejected") {
			await this.workflows.updateStatus(approval.workflowId, "denied");
		}
		return true;
	}

	async resume(input: {
		approvalId: string;
		session: SessionContext;
		currentPolicy: PolicyDecision;
	}): Promise<ResumeWorkflowResult> {
		const approval = await this.approvals.get(input.approvalId);
		if (!approval) {
			return { status: "rejected", reasonCode: "approval_not_found" };
		}
		if (approval.decision !== "approved" || approval.consumedAt !== null) {
			return { status: "rejected", reasonCode: "approval_not_usable" };
		}
		if (Date.parse(approval.expiresAt) <= this.clock.now().getTime()) {
			return { status: "rejected", reasonCode: "approval_expired" };
		}

		const proposal = await this.workflows.get(approval.workflowId);
		if (proposal?.status !== "pending_approval") {
			return { status: "rejected", reasonCode: "workflow_not_resumable" };
		}
		if (
			proposal.identity.userId !== input.session.userId ||
			proposal.identity.tenantId !== input.session.tenantId ||
			proposal.identity.sessionVersion !== input.session.sessionVersion ||
			approval.sessionVersion !== input.session.sessionVersion
		) {
			return { status: "rejected", reasonCode: "session_changed" };
		}
		if (
			input.currentPolicy.outcome !== "ALLOW" ||
			input.currentPolicy.policyVersion !== approval.policyVersion
		) {
			return { status: "rejected", reasonCode: "policy_changed" };
		}
		const expectedHash = actionProposalHash({
			call: proposal.call,
			policyVersion: approval.policyVersion,
			sessionVersion: input.session.sessionVersion,
		});
		if (
			expectedHash !== approval.actionHash ||
			expectedHash !== proposal.actionHash
		) {
			return { status: "rejected", reasonCode: "approval_hash_mismatch" };
		}

		const consumed = await this.approvals.consume(
			approval.approvalId,
			this.clock.now().toISOString(),
		);
		if (!consumed) {
			return { status: "rejected", reasonCode: "approval_replay" };
		}
		await this.workflows.updateStatus(approval.workflowId, "executing");
		return { status: "ready", proposal };
	}
}
