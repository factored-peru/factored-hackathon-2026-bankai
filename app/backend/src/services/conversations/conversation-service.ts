import { randomUUID } from "node:crypto";
import type {
	ConversationMessage,
	ConversationRunStatus,
	ConversationSnapshot,
	SafeAttachment,
	WebsocketServerEvent,
} from "../../domain/conversation/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type {
	AttachmentStore,
	ConversationEventPublisher,
	ConversationRunner,
	ConversationStore,
} from "../ports/conversation.js";

const customerRole = "customer";
const backofficeRole = "backoffice";

function event(
	input: Omit<WebsocketServerEvent, "type"> & {
		type: WebsocketServerEvent["type"];
	},
): WebsocketServerEvent {
	return input;
}

export class ConversationService {
	constructor(
		private readonly store: ConversationStore,
		private readonly attachments: AttachmentStore,
		private readonly publisher: ConversationEventPublisher,
		private readonly runner: ConversationRunner,
		private readonly now: () => Date = () => new Date(),
		private readonly ids: () => string = () => randomUUID(),
	) {}

	async list(session: SessionContext): Promise<ConversationSnapshot[]> {
		return this.store.list(
			session.tenantId,
			this.isBackoffice(session) ? undefined : session.userId,
		);
	}

	async get(
		session: SessionContext,
		threadId: string,
	): Promise<ConversationSnapshot | null> {
		const snapshot = await this.store.get(threadId);
		return snapshot && this.canAccess(session, snapshot) ? snapshot : null;
	}

	async send(input: {
		session: SessionContext;
		threadId?: string;
		clientMessageId: string;
		text?: string;
		attachmentIds: string[];
		traceId: string;
	}): Promise<ConversationSnapshot> {
		if (
			(input.text?.trim().length ?? 0) === 0 &&
			input.attachmentIds.length === 0
		) {
			throw new Error("chat_message_empty");
		}
		const threadId = input.threadId ?? this.ids();
		const previous = await this.store.get(threadId);
		if (previous && !this.canAccess(input.session, previous))
			throw new Error("conversation_not_authorized");
		if (
			previous?.trace.status === "generating" ||
			previous?.trace.status === "queued"
		) {
			throw new Error("conversation_busy");
		}
		const attachments = await this.resolveAttachments(
			input.session,
			input.attachmentIds,
		);
		const now = this.now().toISOString();
		const customerMessage: ConversationMessage = {
			messageId: input.clientMessageId,
			role: this.isBackoffice(input.session) ? backofficeRole : customerRole,
			content: this.safeContent(input.text ?? "", attachments),
			attachments,
			createdAt: now,
		};
		if (
			previous?.messages.some(
				(message) => message.messageId === input.clientMessageId,
			)
		)
			return previous;
		const queued = this.snapshot(
			previous,
			input.session,
			threadId,
			[...(previous?.messages ?? []), customerMessage],
			{
				traceId: input.traceId,
				status: "queued",
				reasonCode: null,
				decisionId: null,
				workflowId: null,
				approvalId: null,
				updatedAt: now,
			},
		);
		if (!(await this.store.save(queued, previous?.revision ?? null)))
			throw new Error("conversation_conflict");
		await this.emit(queued, "run.state", { status: "queued" });
		void this.run(queued, input.session, input.text ?? "");
		return queued;
	}

	private async run(
		snapshot: ConversationSnapshot,
		session: SessionContext,
		rawMessage: string,
	): Promise<void> {
		const emitState = async (status: ConversationRunStatus) => {
			const next = this.snapshot(
				snapshot,
				session,
				snapshot.threadId,
				snapshot.messages,
				{
					...snapshot.trace,
					status,
					updatedAt: this.now().toISOString(),
				},
			);
			if (await this.store.save(next, snapshot.revision)) snapshot = next;
			await this.emit(snapshot, "run.state", { status });
		};
		try {
			await emitState("normalizing");
			await emitState("deciding");
			let streamed = "";
			const result = await this.runner({
				session,
				threadId: snapshot.threadId,
				traceId: snapshot.trace.traceId,
				message: rawMessage,
				onDelta: async (value) => {
					streamed += value;
					await this.emit(snapshot, "assistant.delta", {
						messageId: `${snapshot.trace.traceId}:assistant`,
						value,
					});
				},
				onState: emitState,
			});
			const completedAt = this.now().toISOString();
			const response = result.response || streamed;
			const completed = this.snapshot(
				snapshot,
				session,
				snapshot.threadId,
				[
					...snapshot.messages,
					{
						messageId: `${snapshot.trace.traceId}:assistant`,
						role: "assistant",
						content: response,
						attachments: [],
						createdAt: completedAt,
					},
				],
				{
					...snapshot.trace,
					status: result.status,
					reasonCode: result.reasonCode ?? null,
					decisionId: result.decisionId ?? null,
					workflowId: result.workflowId ?? null,
					approvalId: result.approvalId ?? null,
					updatedAt: completedAt,
				},
			);
			if (await this.store.save(completed, snapshot.revision))
				snapshot = completed;
			const completionEvent =
				result.status === "pending_approval"
					? "hitl.created"
					: result.status === "awaiting_clarification"
						? "run.state"
						: "assistant.completed";
			await this.emit(snapshot, completionEvent, {
				status: result.status,
				response,
				...(result.clarificationId === undefined
					? {}
					: { clarificationId: result.clarificationId }),
				...(result.approvalId === undefined
					? {}
					: { approvalId: result.approvalId }),
			});
			if (result.status === "awaiting_clarification") {
				await this.emit(snapshot, "assistant.completed", {
					status: result.status,
					response,
					clarificationId: result.clarificationId,
				});
			}
			if (result.status === "pending_approval") {
				await this.publisher.publish({
					tenantId: snapshot.tenantId,
					event: event({
						type: "backoffice.alert",
						threadId: snapshot.threadId,
						traceId: snapshot.trace.traceId,
						revision: snapshot.revision,
						payload: { approvalId: result.approvalId },
					}),
				});
			}
		} catch {
			const failed = this.snapshot(
				snapshot,
				session,
				snapshot.threadId,
				snapshot.messages,
				{
					...snapshot.trace,
					status: "failed",
					reasonCode: "conversation_run_failed",
					updatedAt: this.now().toISOString(),
				},
			);
			if (await this.store.save(failed, snapshot.revision))
				await this.emit(failed, "run.state", { status: "failed" });
		}
	}

	private snapshot(
		previous: ConversationSnapshot | null,
		session: SessionContext,
		threadId: string,
		messages: ConversationMessage[],
		trace: ConversationSnapshot["trace"],
	): ConversationSnapshot {
		return {
			threadId,
			tenantId: previous?.tenantId ?? session.tenantId,
			ownerUserId: previous?.ownerUserId ?? session.userId,
			revision: (previous?.revision ?? -1) + 1,
			messages,
			trace,
		};
	}

	private async resolveAttachments(
		session: SessionContext,
		ids: string[],
	): Promise<SafeAttachment[]> {
		return Promise.all(
			ids.map(async (attachmentId) => {
				const attachment = await this.attachments.resolve({
					attachmentId,
					session,
				});
				if (attachment?.status !== "ready")
					throw new Error("attachment_unavailable");
				return attachment;
			}),
		);
	}

	private safeContent(text: string, attachments: SafeAttachment[]): string {
		if (text.trim().length > 0 && attachments.length > 0) {
			return `[Mensaje de cliente y ${attachments.length} adjunto(s) recibido(s); contenido privado]`;
		}
		if (text.trim().length > 0)
			return "[Mensaje de cliente recibido; contenido privado]";
		return `[${attachments.length} adjunto(s) recibido(s); pendiente de revisión]`;
	}

	private async emit(
		snapshot: ConversationSnapshot,
		type: WebsocketServerEvent["type"],
		payload: unknown,
	): Promise<void> {
		await this.publisher.publish({
			tenantId: snapshot.tenantId,
			event: event({
				type,
				threadId: snapshot.threadId,
				traceId: snapshot.trace.traceId,
				revision: snapshot.revision,
				payload,
			}),
		});
	}

	private isBackoffice(session: SessionContext): boolean {
		return session.roles.includes(backofficeRole);
	}
	private canAccess(
		session: SessionContext,
		snapshot: ConversationSnapshot,
	): boolean {
		return (
			snapshot.tenantId === session.tenantId &&
			(this.isBackoffice(session) || snapshot.ownerUserId === session.userId)
		);
	}
}
