import { z } from "zod";

export const disputeStatusSchema = z.enum([
	"open",
	"under_review",
	"escalated",
	"closed",
]);
export type DisputeStatus = z.infer<typeof disputeStatusSchema>;

export const transactionEvidenceSchema = z
	.object({
		transactionId: z.string().min(1),
		tenantId: z.string().min(1),
		ownerUserId: z.string().min(1),
		status: z.enum(["approved", "declined", "pending", "reversed"]),
		amountBucket: z.enum(["low", "medium", "high"]),
		currency: z.string().length(3),
		provenance: z.literal("synthetic_local_fixture"),
		version: z.literal("dispute-demo-v1"),
	})
	.strict();
export type TransactionEvidence = z.infer<typeof transactionEvidenceSchema>;

export const disputeEvidenceSchema = z
	.object({
		disputeId: z.string().min(1),
		transactionId: z.string().min(1),
		tenantId: z.string().min(1),
		ownerUserId: z.string().min(1),
		status: disputeStatusSchema,
		priority: z.enum(["normal", "high"]),
		provenance: z.literal("synthetic_local_fixture"),
		version: z.literal("dispute-demo-v1"),
	})
	.strict();
export type DisputeEvidence = z.infer<typeof disputeEvidenceSchema>;

export const disputeCaseSchema = z
	.object({
		caseId: z.string().min(1),
		disputeId: z.string().min(1),
		tenantId: z.string().min(1),
		ownerUserId: z.string().min(1),
		status: z.enum(["open", "pending_approval", "escalated", "denied"]),
		createdAt: z.string().datetime(),
		updatedAt: z.string().datetime(),
	})
	.strict();
export type DisputeCase = z.infer<typeof disputeCaseSchema>;

export const escalationRequestSchema = z
	.object({
		caseId: z.string().min(1),
		reasonCode: z.enum([
			"unrecognized_transaction",
			"transaction_declined",
			"other",
		]),
	})
	.strict();
export type EscalationRequest = z.infer<typeof escalationRequestSchema>;

export const approvalDecisionSchema = z
	.object({ decision: z.enum(["approved", "rejected"]) })
	.strict();
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

export const verifiedActionSchema = z
	.object({
		actionId: z.string().min(1),
		caseId: z.string().min(1),
		status: z.literal("verified_mock_escalation"),
		effect: z.literal("none"),
		receiptId: z.string().min(1),
		provenance: z.literal("local_mock"),
	})
	.strict();
export type VerifiedAction = z.infer<typeof verifiedActionSchema>;

export const disputeEventSchema = z.discriminatedUnion("type", [
	z
		.object({ type: z.literal("case.updated"), case: disputeCaseSchema })
		.strict(),
	z
		.object({
			type: z.literal("escalation.pending"),
			caseId: z.string().min(1),
			approvalId: z.string().min(1),
		})
		.strict(),
	z
		.object({
			type: z.literal("approval.decided"),
			caseId: z.string().min(1),
			approvalId: z.string().min(1),
			decision: z.enum(["approved", "rejected"]),
		})
		.strict(),
	z
		.object({
			type: z.literal("verified_action"),
			action: verifiedActionSchema,
		})
		.strict(),
]);
export type DisputeEvent = z.infer<typeof disputeEventSchema>;
