import { createHash, randomBytes } from "node:crypto";
import type {
	CreateSessionInput,
	SessionContext,
	SessionStore,
} from "../../domain/session.js";
import type { KeyValueStore } from "./key-value-store.js";

export type KvSessionStoreOptions = {
	keyPrefix: string;
	ttlSeconds: number;
	now?: () => Date;
};

function hashIdentifier(value: string): string {
	return createHash("sha256").update(value).digest("base64url");
}

function createSessionId(): string {
	return randomBytes(32).toString("base64url");
}

function toStoredSession(session: SessionContext): Record<string, string> {
	return {
		user_id: session.userId,
		tenant_id: session.tenantId,
		scopes: JSON.stringify(session.scopes),
		roles: JSON.stringify(session.roles),
		capabilities: JSON.stringify(session.capabilities),
		session_version: String(session.sessionVersion),
		created_at: session.createdAt,
		last_seen_at: session.lastSeenAt,
		expires_at: session.expiresAt,
		revoked_at: session.revokedAt ?? "",
	};
}

function parseStringArray(value: string | undefined): string[] | null {
	if (value === undefined) {
		return null;
	}
	const parsed = JSON.parse(value) as unknown;
	return Array.isArray(parsed) &&
		parsed.every((item): item is string => typeof item === "string")
		? parsed
		: null;
}

function fromStoredSession(
	sessionId: string,
	stored: Record<string, string>,
): SessionContext | null {
	if (Object.keys(stored).length === 0) {
		return null;
	}

	try {
		const userId = stored.user_id;
		const tenantId = stored.tenant_id;
		const createdAt = stored.created_at;
		const lastSeenAt = stored.last_seen_at;
		const expiresAt = stored.expires_at;
		const revokedAt = stored.revoked_at;
		const scopes = parseStringArray(stored.scopes);
		const roles = parseStringArray(stored.roles);
		const capabilities = parseStringArray(stored.capabilities);
		if (
			userId === undefined ||
			tenantId === undefined ||
			createdAt === undefined ||
			lastSeenAt === undefined ||
			expiresAt === undefined ||
			revokedAt === undefined ||
			scopes === null ||
			roles === null ||
			capabilities === null
		) {
			return null;
		}

		const sessionVersion = Number(stored.session_version);
		if (!Number.isSafeInteger(sessionVersion) || sessionVersion < 1) {
			return null;
		}

		return {
			sessionId,
			userId,
			tenantId,
			scopes,
			roles,
			capabilities,
			sessionVersion,
			createdAt,
			lastSeenAt,
			expiresAt,
			revokedAt: revokedAt.length > 0 ? revokedAt : null,
		};
	} catch {
		return null;
	}
}

export class KvSessionStore implements SessionStore {
	private readonly now: () => Date;

	constructor(
		private readonly store: KeyValueStore,
		private readonly options: KvSessionStoreOptions,
	) {
		this.now = options.now ?? (() => new Date());
	}

	async get(sessionId: string): Promise<SessionContext | null> {
		const stored = await this.store.hashGetAll(this.key(sessionId));
		const session = fromStoredSession(sessionId, stored);
		const expiresAtTime = session ? Date.parse(session.expiresAt) : Number.NaN;
		if (
			!session ||
			session.revokedAt !== null ||
			!Number.isFinite(expiresAtTime) ||
			expiresAtTime <= this.now().getTime()
		) {
			return null;
		}

		const now = this.now();
		const expiresAt = new Date(
			now.getTime() + this.options.ttlSeconds * 1000,
		).toISOString();
		await this.store.hashSet(this.key(sessionId), {
			last_seen_at: now.toISOString(),
			expires_at: expiresAt,
		});
		await this.store.expire(this.key(sessionId), this.options.ttlSeconds);

		return { ...session, lastSeenAt: now.toISOString(), expiresAt };
	}

	async create(input: CreateSessionInput): Promise<SessionContext> {
		const now = this.now();
		const session: SessionContext = {
			sessionId: createSessionId(),
			userId: input.userId,
			tenantId: input.tenantId,
			scopes: [...input.scopes],
			roles: [...input.roles],
			capabilities: [...input.capabilities],
			sessionVersion: 1,
			createdAt: now.toISOString(),
			lastSeenAt: now.toISOString(),
			expiresAt: new Date(
				now.getTime() + this.options.ttlSeconds * 1000,
			).toISOString(),
			revokedAt: null,
		};

		const key = this.key(session.sessionId);
		await this.store.hashSet(key, toStoredSession(session));
		await this.store.expire(key, this.options.ttlSeconds);
		return session;
	}

	async rotate(sessionId: string): Promise<SessionContext> {
		const current = await this.get(sessionId);
		if (!current) {
			throw new Error("Cannot rotate an absent or revoked session");
		}

		const next = await this.create({
			userId: current.userId,
			tenantId: current.tenantId,
			scopes: current.scopes,
			roles: current.roles,
			capabilities: current.capabilities,
		});
		await this.store.hashSet(this.key(next.sessionId), {
			session_version: String(current.sessionVersion + 1),
		});
		await this.store.delete(this.key(sessionId));
		return { ...next, sessionVersion: current.sessionVersion + 1 };
	}

	async revoke(sessionId: string, _reason: string): Promise<void> {
		await this.store.delete(this.key(sessionId));
	}

	private key(sessionId: string): string {
		return `${this.options.keyPrefix}session:${hashIdentifier(sessionId)}`;
	}
}
