import { createHash } from "node:crypto";
import type { Firestore } from "@google-cloud/firestore";
import { z } from "zod";
import type {
	UpsertUserProfileInput,
	UserProfile,
	UserProfileStore,
} from "../../services/ports/user-profile.js";

const profileSchema = z
	.object({
		tenantId: z.string().min(1),
		userId: z.string().min(1),
		roles: z.array(z.string().min(1)).min(1),
		capabilities: z.array(z.string().min(1)),
		status: z.enum(["active", "revoked"]),
		displayLabel: z.string().min(1).nullable(),
		updatedAt: z.string().min(1),
	})
	.strict();

function profileId(tenantId: string, userId: string): string {
	return createHash("sha256").update(`${tenantId}\0${userId}`).digest("hex");
}

/**
 * Durable user roles/capabilities for demo→productive continuity.
 * Doc id matches customer_identity_bindings hashing style.
 */
export class FirestoreUserProfileStore implements UserProfileStore {
	constructor(
		private readonly firestore: Firestore,
		private readonly collection = "user_profiles",
		private readonly now: () => Date = () => new Date(),
	) {}

	async get(tenantId: string, userId: string): Promise<UserProfile | null> {
		try {
			const snapshot = await this.firestore
				.collection(this.collection)
				.doc(profileId(tenantId, userId))
				.get();
			if (!snapshot.exists) return null;
			const parsed = profileSchema.safeParse(snapshot.data());
			if (
				!parsed.success ||
				parsed.data.tenantId !== tenantId ||
				parsed.data.userId !== userId
			) {
				return null;
			}
			return parsed.data;
		} catch {
			return null;
		}
	}

	async upsert(input: UpsertUserProfileInput): Promise<UserProfile> {
		const profile: UserProfile = {
			tenantId: input.tenantId,
			userId: input.userId,
			roles: [...input.roles],
			capabilities: [...input.capabilities],
			status: input.status ?? "active",
			displayLabel: input.displayLabel ?? null,
			updatedAt: this.now().toISOString(),
		};
		await this.firestore
			.collection(this.collection)
			.doc(profileId(input.tenantId, input.userId))
			.set(profile);
		return profile;
	}
}
