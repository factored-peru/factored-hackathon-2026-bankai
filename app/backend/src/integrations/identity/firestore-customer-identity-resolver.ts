import { createHash } from "node:crypto";
import type { Firestore } from "@google-cloud/firestore";
import { z } from "zod";
import type { SessionContext } from "../../domain/session.js";
import type { CustomerIdentityResolver } from "../../services/ports/customer-identity.js";

const bindingSchema = z
	.object({
		tenantId: z.string().min(1),
		userId: z.string().min(1),
		customerId: z.string().min(1),
		status: z.literal("active"),
		version: z.string().min(1),
	})
	.strict();

function bindingId(tenantId: string, userId: string): string {
	return createHash("sha256").update(`${tenantId}\0${userId}`).digest("hex");
}

/**
 * Resolves the authenticated user-to-customer binding from a private Firestore
 * collection. Invalid, stale, revoked, or missing bindings return null so the
 * caller can fail closed; no browser input participates in the lookup.
 */
export class FirestoreCustomerIdentityResolver
	implements CustomerIdentityResolver
{
	constructor(
		private readonly firestore: Firestore,
		private readonly collection = "customer_identity_bindings",
	) {}

	async resolve(session: SessionContext): Promise<string | null> {
		if (session.revokedAt !== null) return null;
		try {
			const snapshot = await this.firestore
				.collection(this.collection)
				.doc(bindingId(session.tenantId, session.userId))
				.get();
			if (!snapshot.exists) return null;
			const binding = bindingSchema.safeParse(snapshot.data());
			if (
				!binding.success ||
				binding.data.tenantId !== session.tenantId ||
				binding.data.userId !== session.userId
			)
				return null;
			return binding.data.customerId;
		} catch {
			return null;
		}
	}
}
