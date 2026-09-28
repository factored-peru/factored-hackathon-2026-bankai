import {
	type SafeAuditEvent,
	safeAuditEventSchema,
} from "../../domain/observability/audit-event.js";
import type {
	ActionProposal,
	Approval,
	Clarification,
	WorkflowStatus,
} from "../../domain/workflows/contracts.js";
import type { AuditSink } from "../../services/ports/observability.js";
import type {
	IdempotencyClaim,
	IdempotencyStore,
} from "../../services/ports/tools.js";
import type {
	ApprovalStore,
	ClarificationStore,
	WorkflowStore,
} from "../../services/ports/workflows.js";

type IdempotencyRecord = {
	payloadHash: string;
	status: "in_progress" | "completed" | "indeterminate";
	result: unknown;
};

export class InMemoryIdempotencyStore implements IdempotencyStore {
	private readonly records = new Map<string, IdempotencyRecord>();

	async claim(key: string, payloadHash: string): Promise<IdempotencyClaim> {
		const current = this.records.get(key);
		if (!current) {
			this.records.set(key, {
				payloadHash,
				status: "in_progress",
				result: null,
			});
			return { status: "acquired" };
		}
		if (current.payloadHash !== payloadHash) {
			return { status: "conflict" };
		}
		return current.status === "completed"
			? { status: "replay", result: current.result }
			: { status: "in_progress" };
	}

	async complete(
		key: string,
		payloadHash: string,
		result: unknown,
	): Promise<void> {
		this.records.set(key, { payloadHash, status: "completed", result });
	}

	async markIndeterminate(key: string, payloadHash: string): Promise<void> {
		this.records.set(key, {
			payloadHash,
			status: "indeterminate",
			result: null,
		});
	}

	async release(key: string, payloadHash: string): Promise<void> {
		const current = this.records.get(key);
		if (
			current?.payloadHash === payloadHash &&
			current.status === "in_progress"
		) {
			this.records.delete(key);
		}
	}
}

export class InMemoryWorkflowStore implements WorkflowStore {
	private readonly workflows = new Map<string, ActionProposal>();

	async save(proposal: ActionProposal): Promise<void> {
		this.workflows.set(proposal.identity.workflowId, structuredClone(proposal));
	}

	async get(workflowId: string): Promise<ActionProposal | null> {
		const proposal = this.workflows.get(workflowId);
		return proposal ? structuredClone(proposal) : null;
	}

	async updateStatus(
		workflowId: string,
		status: WorkflowStatus,
	): Promise<void> {
		const current = this.workflows.get(workflowId);
		if (!current) {
			throw new Error("Workflow not found");
		}
		this.workflows.set(workflowId, { ...current, status });
	}
}

export class InMemoryApprovalStore implements ApprovalStore {
	private readonly approvals = new Map<string, Approval>();

	async save(approval: Approval): Promise<void> {
		this.approvals.set(approval.approvalId, structuredClone(approval));
	}

	async get(approvalId: string): Promise<Approval | null> {
		const approval = this.approvals.get(approvalId);
		return approval ? structuredClone(approval) : null;
	}

	async consume(approvalId: string, consumedAt: string): Promise<boolean> {
		const current = this.approvals.get(approvalId);
		if (
			!current ||
			current.consumedAt !== null ||
			current.decision !== "approved"
		) {
			return false;
		}
		this.approvals.set(approvalId, { ...current, consumedAt });
		return true;
	}

	async decide(
		approvalId: string,
		decision: "approved" | "rejected",
	): Promise<boolean> {
		const current = this.approvals.get(approvalId);
		if (current?.decision !== "pending" || current.consumedAt !== null) {
			return false;
		}
		this.approvals.set(approvalId, { ...current, decision });
		return true;
	}
}

export class InMemoryClarificationStore implements ClarificationStore {
	private readonly clarifications = new Map<string, Clarification>();

	async save(clarification: Clarification): Promise<void> {
		this.clarifications.set(
			clarification.clarificationId,
			structuredClone(clarification),
		);
	}

	async get(clarificationId: string): Promise<Clarification | null> {
		const clarification = this.clarifications.get(clarificationId);
		return clarification ? structuredClone(clarification) : null;
	}

	async answer(
		clarificationId: string,
		answer: string,
		answeredAt: string,
	): Promise<boolean> {
		const current = this.clarifications.get(clarificationId);
		if (current?.status !== "pending") {
			return false;
		}
		this.clarifications.set(clarificationId, {
			...current,
			answer,
			answeredAt,
			status: "answered",
		});
		return true;
	}
}

export class InMemoryAuditSink implements AuditSink {
	readonly events: SafeAuditEvent[] = [];

	async record(event: SafeAuditEvent): Promise<void> {
		this.events.push(safeAuditEventSchema.parse(event));
	}
}
