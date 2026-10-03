import type { SessionContext, SessionStore } from "../domain/session.js";
import type { IdentityVerifier } from "./ports/control.js";

export class SessionAuthService {
	constructor(
		private readonly identities: IdentityVerifier,
		private readonly sessions: SessionStore,
		private readonly now: () => Date = () => new Date(),
	) {}

	async create(idToken: string): Promise<SessionContext> {
		const identity = await this.identities.verify(idToken);
		return this.sessions.create({
			userId: identity.userId,
			tenantId: identity.tenantId,
			roles: identity.roles,
			capabilities: identity.capabilities,
			scopes: ["dispute:read"],
		});
	}

	async resolve(sessionId: string): Promise<SessionContext | null> {
		const session = await this.sessions.get(sessionId);
		if (
			!session ||
			session.revokedAt !== null ||
			Date.parse(session.expiresAt) <= this.now().getTime()
		)
			return null;
		return session;
	}
}
