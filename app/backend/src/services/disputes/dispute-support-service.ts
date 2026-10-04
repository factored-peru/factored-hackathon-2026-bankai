import type {
	ApprovalDecision,
	DisputeCase,
	DisputeEvent,
	DisputeEvidence,
	EscalationRequest,
	TransactionEvidence,
	VerifiedAction,
} from "../../domain/disputes/contracts.js";
import type { SessionContext } from "../../domain/session.js";

export interface DisputeSupportStore {
	getTransaction(transactionId: string): Promise<TransactionEvidence | null>;
	getDispute(disputeId: string): Promise<DisputeEvidence | null>;
	getCase(caseId: string): Promise<DisputeCase | null>;
	saveCase(value: DisputeCase): Promise<void>;
	getApproval(approvalId: string): Promise<{
		approvalId: string;
		caseId: string;
		tenantId: string;
		status: "pending" | "approved" | "rejected";
	} | null>;
	saveApproval(value: {
		approvalId: string;
		caseId: string;
		tenantId: string;
		status: "pending" | "approved" | "rejected";
	}): Promise<void>;
}

export interface DisputeEventSink {
	publish(event: DisputeEvent): Promise<void>;
}

export type DisputeSupportResult<T> =
	| Readonly<{ status: "ok"; value: T }>
	| Readonly<{
			status: "not_found" | "forbidden" | "invalid";
			reasonCode: string;
	  }>;

export class DisputeSupportService {
	constructor(
		private readonly store: DisputeSupportStore,
		private readonly events: DisputeEventSink,
		private readonly now: () => Date = () => new Date(),
		private readonly nextId: () => string = () => crypto.randomUUID(),
	) {}

	async transaction(
		session: SessionContext,
		transactionId: string,
	): Promise<DisputeSupportResult<TransactionEvidence>> {
		const transaction = await this.store.getTransaction(transactionId);
		if (!transaction)
			return { status: "not_found", reasonCode: "transaction_not_found" };
		return this.owns(session, transaction)
			? { status: "ok", value: transaction }
			: { status: "forbidden", reasonCode: "transaction_not_authorized" };
	}

	async dispute(
		session: SessionContext,
		disputeId: string,
	): Promise<DisputeSupportResult<DisputeEvidence>> {
		const dispute = await this.store.getDispute(disputeId);
		if (!dispute)
			return { status: "not_found", reasonCode: "dispute_not_found" };
		return this.owns(session, dispute)
			? { status: "ok", value: dispute }
			: { status: "forbidden", reasonCode: "dispute_not_authorized" };
	}

	async case(
		session: SessionContext,
		caseId: string,
	): Promise<DisputeSupportResult<DisputeCase>> {
		const value = await this.store.getCase(caseId);
		if (!value) return { status: "not_found", reasonCode: "case_not_found" };
		return this.owns(session, value)
			? { status: "ok", value }
			: { status: "forbidden", reasonCode: "case_not_authorized" };
	}

	async requestEscalation(
		session: SessionContext,
		input: EscalationRequest,
	): Promise<DisputeSupportResult<{ case: DisputeCase; approvalId: string }>> {
		if (!session.capabilities.includes("dispute.escalation.request")) {
			return { status: "forbidden", reasonCode: "capability_missing" };
		}
		const current = await this.case(session, input.caseId);
		if (current.status !== "ok") return current;
		if (current.value.status !== "open") {
			return { status: "invalid", reasonCode: "case_not_open" };
		}
		const updated = {
			...current.value,
			status: "pending_approval" as const,
			updatedAt: this.now().toISOString(),
		};
		const approvalId = this.nextId();
		await this.store.saveCase(updated);
		await this.store.saveApproval({
			approvalId,
			caseId: updated.caseId,
			tenantId: updated.tenantId,
			status: "pending",
		});
		await this.events.publish({ type: "case.updated", case: updated });
		await this.events.publish({
			type: "escalation.pending",
			caseId: updated.caseId,
			approvalId,
		});
		return { status: "ok", value: { case: updated, approvalId } };
	}

	async decideEscalation(
		session: SessionContext,
		approvalId: string,
		input: ApprovalDecision,
	): Promise<
		DisputeSupportResult<{ case: DisputeCase; action: VerifiedAction | null }>
	> {
		if (!session.capabilities.includes("dispute.escalation.decide")) {
			return { status: "forbidden", reasonCode: "capability_missing" };
		}
		const approval = await this.store.getApproval(approvalId);
		if (!approval)
			return { status: "not_found", reasonCode: "approval_not_found" };
		if (
			approval.tenantId !== session.tenantId ||
			approval.status !== "pending"
		) {
			return { status: "forbidden", reasonCode: "approval_not_authorized" };
		}
		const current = await this.store.getCase(approval.caseId);
		if (current?.status !== "pending_approval") {
			return { status: "invalid", reasonCode: "approval_not_resumable" };
		}
		const updated = {
			...current,
			status:
				input.decision === "approved"
					? ("escalated" as const)
					: ("denied" as const),
			updatedAt: this.now().toISOString(),
		};
		await this.store.saveApproval({ ...approval, status: input.decision });
		await this.store.saveCase(updated);
		await this.events.publish({
			type: "approval.decided",
			caseId: updated.caseId,
			approvalId,
			decision: input.decision,
		});
		await this.events.publish({ type: "case.updated", case: updated });
		if (input.decision === "rejected")
			return { status: "ok", value: { case: updated, action: null } };
		const action: VerifiedAction = {
			actionId: this.nextId(),
			caseId: updated.caseId,
			status: "verified_mock_escalation",
			effect: "none",
			receiptId: this.nextId(),
			provenance: "local_mock",
		};
		await this.events.publish({ type: "verified_action", action });
		return { status: "ok", value: { case: updated, action } };
	}

	private owns(
		session: SessionContext,
		value: { tenantId: string; ownerUserId: string },
	): boolean {
		return (
			value.tenantId === session.tenantId &&
			(session.roles.includes("operator") ||
				session.roles.includes("backoffice") ||
				value.ownerUserId === session.userId)
		);
	}
}
