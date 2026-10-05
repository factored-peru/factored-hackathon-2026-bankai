import type { DemoActorDirectory } from "../../services/ports/conversation.js";
import type { UserProfileStore } from "../../services/ports/user-profile.js";

/**
 * Prefer durable user_profiles roles/capabilities when present; otherwise
 * fall back to the demo actor directory (in-memory or BigQuery).
 */
export class UserProfileBackedActorDirectory implements DemoActorDirectory {
	constructor(
		private readonly inner: DemoActorDirectory,
		private readonly profiles: UserProfileStore,
	) {}

	list(): Promise<
		ReadonlyArray<{
			actorId: string;
			label: string;
			role: "customer" | "backoffice";
			recommended: boolean;
		}>
	> {
		return this.inner.list();
	}

	async resolve(actorId: string) {
		const base = await this.inner.resolve(actorId);
		if (!base) return null;
		const profile = await this.profiles.get(base.tenantId, base.userId);
		if (!profile || profile.status !== "active") return base;
		return {
			userId: base.userId,
			tenantId: base.tenantId,
			roles: [...profile.roles],
			capabilities: [...profile.capabilities],
		};
	}
}
