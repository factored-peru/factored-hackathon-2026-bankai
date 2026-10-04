import { randomUUID } from "node:crypto";
import type { Firestore } from "@google-cloud/firestore";
import type { Storage } from "@google-cloud/storage";
import type { SafeAttachment } from "../../domain/conversation/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { AttachmentStore } from "../../services/ports/conversation.js";

const allowedMediaTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"audio/mpeg",
	"audio/wav",
	"audio/mp4",
]);

type StoredAttachment = SafeAttachment & {
	ownerUserId: string;
	tenantId: string;
	objectName: string;
	byteSize: number;
};

/** Issues private signed PUT URLs; callers never receive a GCS object name. */
export class GcsAttachmentStore implements AttachmentStore {
	constructor(
		private readonly storage: Storage,
		private readonly firestore: Firestore,
		private readonly bucketName: string,
		private readonly prefix: string,
		private readonly maxBytes: number,
	) {}

	async create(input: {
		session: SessionContext;
		kind: "image" | "audio";
		mediaType: string;
		byteSize: number;
		filename: string;
	}): Promise<{ attachment: SafeAttachment; uploadUrl: string }> {
		if (
			!allowedMediaTypes.has(input.mediaType) ||
			input.byteSize > this.maxBytes ||
			input.byteSize <= 0
		)
			throw new Error("attachment_invalid");
		if ((input.kind === "image") !== input.mediaType.startsWith("image/"))
			throw new Error("attachment_kind_mismatch");
		const attachmentId = randomUUID();
		const objectName = `${this.prefix.replace(/\/$/, "")}/${attachmentId}`;
		const record: StoredAttachment = {
			attachmentId,
			kind: input.kind,
			mediaType: input.mediaType,
			status: "pending_upload",
			ownerUserId: input.session.userId,
			tenantId: input.session.tenantId,
			objectName,
			byteSize: input.byteSize,
		};
		await this.firestore
			.collection("conversation_attachments")
			.doc(attachmentId)
			.set(record);
		const [uploadUrl] = await this.storage
			.bucket(this.bucketName)
			.file(objectName)
			.getSignedUrl({
				version: "v4",
				action: "write",
				expires: Date.now() + 15 * 60_000,
				contentType: input.mediaType,
			});
		return { attachment: this.safe(record), uploadUrl };
	}

	async complete(input: {
		attachmentId: string;
		session: SessionContext;
	}): Promise<SafeAttachment | null> {
		const record = await this.load(input.attachmentId);
		if (!record || !this.owns(record, input.session)) return null;
		const [metadata] = await this.storage
			.bucket(this.bucketName)
			.file(record.objectName)
			.getMetadata();
		if (
			metadata.contentType !== record.mediaType ||
			Number(metadata.size) !== record.byteSize
		)
			return null;
		const completed: StoredAttachment = { ...record, status: "ready" };
		await this.firestore
			.collection("conversation_attachments")
			.doc(record.attachmentId)
			.set(completed);
		return this.safe(completed);
	}

	async resolve(input: {
		attachmentId: string;
		session: SessionContext;
	}): Promise<SafeAttachment | null> {
		const record = await this.load(input.attachmentId);
		return record && this.owns(record, input.session)
			? this.safe(record)
			: null;
	}

	private async load(attachmentId: string): Promise<StoredAttachment | null> {
		const snapshot = await this.firestore
			.collection("conversation_attachments")
			.doc(attachmentId)
			.get();
		return snapshot.exists ? (snapshot.data() as StoredAttachment) : null;
	}
	private owns(record: StoredAttachment, session: SessionContext): boolean {
		return (
			record.ownerUserId === session.userId &&
			record.tenantId === session.tenantId
		);
	}
	private safe(record: StoredAttachment): SafeAttachment {
		return {
			attachmentId: record.attachmentId,
			kind: record.kind,
			mediaType: record.mediaType,
			status: record.status,
		};
	}
}
