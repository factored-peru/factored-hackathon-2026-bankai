import type { DecisionState, PolicyDecision } from "../control/contracts.js";
import type { ProposedToolCall } from "../tools/contracts.js";

export type WorkflowStatus =
	| "proposed"
	| "waiting_for_clarification"
	| "pending_approval"
	| "executing"
	| "completed"
	| "denied"
	| "needs_reconciliation"
	| "cancelled";

export type WorkflowIdentity = Readonly<{
	workflowId: string;
	threadId: string;
	userId: string;
	tenantId: string;
	sessionVersion: number;
}>;

export type ActionProposal = Readonly<{
	identity: WorkflowIdentity;
	call: ProposedToolCall;
	actionHash: string;
	policyDecision: PolicyDecision;
	decisionState: DecisionState;
	status: WorkflowStatus;
	createdAt: string;
}>;

export type Approval = Readonly<{
	approvalId: string;
	workflowId: string;
	actionHash: string;
	policyVersion: string;
	sessionVersion: number;
	expiresAt: string;
	consumedAt: string | null;
	decision: "pending" | "approved" | "rejected";
}>;

export type Clarification = Readonly<{
	clarificationId: string;
	workflowId: string;
	threadId: string;
	userId: string;
	tenantId: string;
	sessionVersion: number;
	question: string;
	decisionState: DecisionState;
	policyDecision: PolicyDecision | null;
	expiresAt: string;
	answeredAt: string | null;
	answer: string | null;
	status: "pending" | "answered" | "expired";
}>;
