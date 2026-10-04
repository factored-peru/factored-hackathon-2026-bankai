import { z } from "zod";
import type { SessionContext } from "../../domain/session.js";
import type { CustomerIdentityResolver } from "../../services/ports/customer-identity.js";

const customerLinkSchema = z
	.object({
		tenantId: z.string().min(1),
		userId: z.string().min(1),
		customerId: z.string().min(1),
	})
	.strict();

const customerLinksSchema = z.array(customerLinkSchema);

export type CustomerLink = z.infer<typeof customerLinkSchema>;

function linkKey(tenantId: string, userId: string): string {
	return JSON.stringify([tenantId, userId]);
}

/**
 * Parses a list of `{ tenantId, userId, customerId }` links and rejects the
 * whole list when any entry is malformed or a user is linked twice, so a typo
 * can never silently map a user to the wrong customer.
 */
export function parseCustomerLinks(input: unknown): CustomerLink[] {
	const links = customerLinksSchema.parse(input);
	const seen = new Set<string>();
	for (const link of links) {
		const key = linkKey(link.tenantId, link.userId);
		if (seen.has(key)) {
			throw new Error("Duplicate customer link for a tenant and user");
		}
		seen.add(key);
	}
	return links;
}

/**
 * Fixed user-to-customer map for demos and tests. It is not a production
 * source of identity: replace it with a durable adapter (Firestore) behind the
 * same port. Links come from the caller, never from Git.
 */
export class StaticCustomerIdentityResolver
	implements CustomerIdentityResolver
{
	private readonly customers: ReadonlyMap<string, string>;

	constructor(links: readonly CustomerLink[]) {
		this.customers = new Map(
			parseCustomerLinks(links).map((link) => [
				linkKey(link.tenantId, link.userId),
				link.customerId,
			]),
		);
	}

	async resolve(session: SessionContext): Promise<string | null> {
		if (session.revokedAt !== null) {
			return null;
		}
		return (
			this.customers.get(linkKey(session.tenantId, session.userId)) ?? null
		);
	}
}
