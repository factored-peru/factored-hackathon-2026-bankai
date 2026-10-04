import type { Firestore } from "@google-cloud/firestore";
import {
	type ConversationSnapshot,
	conversationSnapshotSchema,
} from "../../domain/conversation/contracts.js";
import type { ConversationStore } from "../../services/ports/conversation.js";

/** Durable, sanitized conversation snapshots. Raw prompts never reach this adapter. */
export class FirestoreConversationStore implements ConversationStore {
	constructor(
		private readonly firestore: Firestore,
		private readonly collection = "conversation_snapshots",
	) {}

	async get(threadId: string): Promise<ConversationSnapshot | null> {
		const document = await this.firestore
			.collection(this.collection)
			.doc(threadId)
			.get();
		return document.exists ? this.parse(document.data()) : null;
	}

	async list(
		tenantId: string,
		ownerUserId?: string,
	): Promise<ConversationSnapshot[]> {
		let query: FirebaseFirestore.Query = this.firestore
			.collection(this.collection)
			.where("tenantId", "==", tenantId);
		if (ownerUserId !== undefined)
			query = query.where("ownerUserId", "==", ownerUserId);
		const result = await query
			.orderBy("trace.updatedAt", "desc")
			.limit(100)
			.get();
		return result.docs.map((document) => this.parse(document.data()));
	}

	async save(
		snapshot: ConversationSnapshot,
		expectedRevision: number | null,
	): Promise<boolean> {
		return this.firestore.runTransaction(async (transaction) => {
			const reference = this.firestore
				.collection(this.collection)
				.doc(snapshot.threadId);
			const current = await transaction.get(reference);
			const revision = current.exists
				? this.parse(current.data()).revision
				: null;
			if (revision !== expectedRevision) return false;
			transaction.set(reference, snapshot);
			return true;
		});
	}

	private parse(value: unknown): ConversationSnapshot {
		return conversationSnapshotSchema.parse(value);
	}
}
