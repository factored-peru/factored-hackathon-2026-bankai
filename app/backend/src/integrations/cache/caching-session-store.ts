import type {
	CreateSessionInput,
	SessionContext,
	SessionStore,
} from "../../domain/session.js";
import { withLruCache } from "./lru-memo.js";

const DEFAULT_MAX = 512;
const DEFAULT_TTL_MS = 5_000;

/**
 * L1 process cache in front of Valkey/in-memory SessionStore.
 * Invalidates on create/rotate/revoke so revoke and sessionVersion stay fresh.
 */
export class CachingSessionStore implements SessionStore {
	private readonly cachedGet;

	constructor(
		private readonly inner: SessionStore,
		options: { maxEntries?: number; ttlMs?: number } = {},
	) {
		this.cachedGet = withLruCache(
			(sessionId: string) => this.inner.get(sessionId),
			{
				maxEntries: options.maxEntries ?? DEFAULT_MAX,
				ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
				keyFn: (sessionId) => sessionId,
			},
		);
	}

	get(sessionId: string): Promise<SessionContext | null> {
		return this.cachedGet.get(sessionId);
	}

	async create(input: CreateSessionInput): Promise<SessionContext> {
		const created = await this.inner.create(input);
		this.cachedGet.invalidate(created.sessionId);
		return created;
	}

	async rotate(sessionId: string): Promise<SessionContext> {
		this.cachedGet.invalidate(sessionId);
		const rotated = await this.inner.rotate(sessionId);
		this.cachedGet.invalidate(sessionId);
		return rotated;
	}

	async revoke(sessionId: string, reason: string): Promise<void> {
		this.cachedGet.invalidate(sessionId);
		await this.inner.revoke(sessionId, reason);
		this.cachedGet.invalidate(sessionId);
	}
}
