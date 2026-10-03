import type {
	CreateSessionInput,
	SessionContext,
	SessionStore,
} from "../../domain/session.js";

export class InMemorySessionStore implements SessionStore {
	private readonly records = new Map<string, SessionContext>();

	constructor(
		private readonly now: () => Date = () => new Date(),
		private readonly ttlSeconds = 1800,
		private readonly nextId: () => string = () => crypto.randomUUID(),
	) {}

	async get(sessionId: string): Promise<SessionContext | null> {
		const value = this.records.get(sessionId);
		return value ? structuredClone(value) : null;
	}

	async create(input: CreateSessionInput): Promise<SessionContext> {
		const now = this.now();
		const value: SessionContext = {
			sessionId: this.nextId(),
			userId: input.userId,
			tenantId: input.tenantId,
			scopes: [...input.scopes],
			roles: [...input.roles],
			capabilities: [...input.capabilities],
			sessionVersion: 1,
			createdAt: now.toISOString(),
			lastSeenAt: now.toISOString(),
			expiresAt: new Date(now.getTime() + this.ttlSeconds * 1000).toISOString(),
			revokedAt: null,
		};
		this.records.set(value.sessionId, value);
		return structuredClone(value);
	}

	async rotate(sessionId: string): Promise<SessionContext> {
		const current = this.records.get(sessionId);
		if (!current) throw new Error("Session not found");
		const updated = {
			...current,
			sessionVersion: current.sessionVersion + 1,
			lastSeenAt: this.now().toISOString(),
		};
		this.records.set(sessionId, updated);
		return structuredClone(updated);
	}

	async revoke(sessionId: string, _reason: string): Promise<void> {
		const current = this.records.get(sessionId);
		if (current)
			this.records.set(sessionId, {
				...current,
				revokedAt: this.now().toISOString(),
			});
	}
}
