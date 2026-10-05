import type { ConversationSnapshot } from "../../domain/conversation/contracts.js";
import type { ConversationStore } from "../../services/ports/conversation.js";
import { withLruCache } from "./lru-memo.js";

const DEFAULT_MAX = 256;
const DEFAULT_TTL_MS = 10_000;

/** L1 cache for conversation snapshot reads; invalidated on successful save. */
export class CachingConversationStore implements ConversationStore {
	private readonly cachedGet;

	constructor(
		private readonly inner: ConversationStore,
		options: { maxEntries?: number; ttlMs?: number } = {},
	) {
		this.cachedGet = withLruCache(
			(threadId: string) => this.inner.get(threadId),
			{
				maxEntries: options.maxEntries ?? DEFAULT_MAX,
				ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
				keyFn: (threadId) => threadId,
			},
		);
	}

	get(threadId: string): Promise<ConversationSnapshot | null> {
		return this.cachedGet.get(threadId);
	}

	list(
		tenantId: string,
		ownerUserId?: string,
	): Promise<ConversationSnapshot[]> {
		return this.inner.list(tenantId, ownerUserId);
	}

	async save(
		snapshot: ConversationSnapshot,
		expectedRevision: number | null,
	): Promise<boolean> {
		const ok = await this.inner.save(snapshot, expectedRevision);
		if (ok) this.cachedGet.invalidate(snapshot.threadId);
		return ok;
	}
}
