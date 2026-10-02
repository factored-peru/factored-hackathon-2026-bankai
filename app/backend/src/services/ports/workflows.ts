import type {
	ActionProposal,
	Approval,
	Clarification,
} from "../../domain/workflows/contracts.js";

export interface WorkflowStore {
	save(proposal: ActionProposal): Promise<void>;
	get(workflowId: string): Promise<ActionProposal | null>;
	updateStatus(
		workflowId: string,
		status: ActionProposal["status"],
	): Promise<void>;
}

export interface ApprovalStore {
	save(approval: Approval): Promise<void>;
	get(approvalId: string): Promise<Approval | null>;
	consume(approvalId: string, consumedAt: string): Promise<boolean>;
	decide(
		approvalId: string,
		decision: "approved" | "rejected",
	): Promise<boolean>;
}

export interface ClarificationStore {
	save(clarification: Clarification): Promise<void>;
	get(clarificationId: string): Promise<Clarification | null>;
	answer(
		clarificationId: string,
		answer: string,
		answeredAt: string,
	): Promise<boolean>;
}

export interface Clock {
	now(): Date;
}

export interface IdGenerator {
	next(): string;
}
