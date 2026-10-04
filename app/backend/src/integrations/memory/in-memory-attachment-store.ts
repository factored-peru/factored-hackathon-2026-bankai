import { randomUUID } from "node:crypto";
import type { SafeAttachment } from "../../domain/conversation/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { AttachmentStore } from "../../services/ports/conversation.js";

type Record = SafeAttachment & {
	ownerUserId: string;
	tenantId: string;
	byteSize: number;
	content?: Uint8Array;
};

export class InMemoryAttachmentStore implements AttachmentStore {
	private readonly records = new Map<string, Record>();

	async create(input: {
		session: SessionContext;
		kind: "image" | "audio";
		mediaType: string;
		byteSize: number;
		filename: string;
	}): Promise<{ attachment: SafeAttachment; uploadUrl: string }> {
		const attachment: Record = {
			attachmentId: randomUUID(),
			kind: input.kind,
			mediaType: input.mediaType,
			status: "pending_upload",
			ownerUserId: input.session.userId,
			tenantId: input.session.tenantId,
			byteSize: input.byteSize,
		};
		this.records.set(attachment.attachmentId, attachment);
		return {
			attachment: this.safe(attachment),
			uploadUrl: `/v1/demo/uploads/${attachment.attachmentId}`,
		};
	}

	async upload(input: {
		attachmentId: string;
		session: SessionContext;
		mediaType: string;
		content: Uint8Array;
	}): Promise<SafeAttachment | null> {
		const value = this.records.get(input.attachmentId);
		if (
			!value ||
			!this.owns(value, input.session) ||
			value.status !== "pending_upload" ||
			value.mediaType !== input.mediaType ||
			value.byteSize !== input.content.byteLength
		)
			return null;
		const uploaded: Record = {
			...value,
			status: "pending_review",
			content: new Uint8Array(input.content),
		};
		this.records.set(uploaded.attachmentId, uploaded);
		return this.safe(uploaded);
	}

	async complete(input: {
		attachmentId: string;
		session: SessionContext;
	}): Promise<SafeAttachment | null> {
		const value = this.records.get(input.attachmentId);
		if (!value || !this.owns(value, input.session)) return null;
		if (value.status !== "pending_review" || !value.content) return null;
		const completed: Record = { ...value, status: "ready" };
		this.records.set(completed.attachmentId, completed);
		return this.safe(completed);
	}

	async resolve(input: {
		attachmentId: string;
		session: SessionContext;
	}): Promise<SafeAttachment | null> {
		const value = this.records.get(input.attachmentId);
		return value && this.owns(value, input.session) ? this.safe(value) : null;
	}

	private owns(value: Record, session: SessionContext): boolean {
		return (
			value.ownerUserId === session.userId &&
			value.tenantId === session.tenantId
		);
	}
	private safe(value: Record): SafeAttachment {
		const { ownerUserId: _owner, tenantId: _tenant, ...safe } = value;
		return safe;
	}
}
