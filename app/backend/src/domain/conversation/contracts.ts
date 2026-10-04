import { z } from "zod";

export const conversationRoleSchema = z.enum([
	"customer",
	"backoffice",
	"assistant",
]);
export type ConversationRole = z.infer<typeof conversationRoleSchema>;

export const conversationRunStatusSchema = z.enum([
	"queued",
	"normalizing",
	"deciding",
	"retrieving",
	"generating",
	"awaiting_clarification",
	"pending_approval",
	"completed",
	"denied",
	"failed",
]);
export type ConversationRunStatus = z.infer<typeof conversationRunStatusSchema>;

export const attachmentKindSchema = z.enum(["image", "audio"]);
export type AttachmentKind = z.infer<typeof attachmentKindSchema>;

export const attachmentStatusSchema = z.enum([
	"pending_upload",
	"pending_review",
	"ready",
	"rejected",
]);
export type AttachmentStatus = z.infer<typeof attachmentStatusSchema>;

export const safeAttachmentSchema = z
	.object({
		attachmentId: z.string().min(1),
		kind: attachmentKindSchema,
		mediaType: z.string().min(1),
		status: attachmentStatusSchema,
	})
	.strict();
export type SafeAttachment = z.infer<typeof safeAttachmentSchema>;

export const conversationMessageSchema = z
	.object({
		messageId: z.string().min(1),
		role: conversationRoleSchema,
		content: z.string(),
		attachments: z.array(safeAttachmentSchema),
		createdAt: z.string().datetime(),
	})
	.strict();
export type ConversationMessage = z.infer<typeof conversationMessageSchema>;

export const conversationTraceSchema = z
	.object({
		traceId: z.string().min(1),
		status: conversationRunStatusSchema,
		reasonCode: z.string().min(1).nullable(),
		decisionId: z.string().min(1).nullable(),
		workflowId: z.string().min(1).nullable(),
		approvalId: z.string().min(1).nullable(),
		updatedAt: z.string().datetime(),
	})
	.strict();
export type ConversationTrace = z.infer<typeof conversationTraceSchema>;

export const conversationSnapshotSchema = z
	.object({
		threadId: z.string().min(1),
		tenantId: z.string().min(1),
		ownerUserId: z.string().min(1),
		revision: z.number().int().nonnegative(),
		messages: z.array(conversationMessageSchema),
		trace: conversationTraceSchema,
	})
	.strict();
export type ConversationSnapshot = z.infer<typeof conversationSnapshotSchema>;

export const websocketClientEventSchema = z.discriminatedUnion("type", [
	z
		.object({
			type: z.literal("conversation.subscribe"),
			threadId: z.string().min(1),
		})
		.strict(),
	z
		.object({
			type: z.literal("chat.send"),
			threadId: z.string().min(1).optional(),
			clientMessageId: z.string().min(1).max(128),
			text: z.string().max(16_000).optional(),
			attachmentIds: z.array(z.string().min(1)).max(3).default([]),
		})
		.strict(),
]);
export type WebsocketClientEvent = z.infer<typeof websocketClientEventSchema>;

export const websocketServerEventSchema = z
	.object({
		type: z.enum([
			"session.ready",
			"conversation.snapshot",
			"run.state",
			"assistant.delta",
			"assistant.completed",
			"hitl.created",
			"backoffice.alert",
			"problem",
		]),
		threadId: z.string().min(1).nullable(),
		traceId: z.string().min(1).nullable(),
		revision: z.number().int().nonnegative().nullable(),
		payload: z.unknown(),
	})
	.strict();
export type WebsocketServerEvent = z.infer<typeof websocketServerEventSchema>;
