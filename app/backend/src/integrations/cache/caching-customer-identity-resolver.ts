import type { SessionContext } from "../../domain/session.js";
import type { CustomerIdentityResolver } from "../../services/ports/customer-identity.js";
import { withLruCache } from "./lru-memo.js";

const DEFAULT_MAX = 512;
const DEFAULT_TTL_MS = 30_000;

/** LRU in front of a durable customer-identity resolver. */
export class CachingCustomerIdentityResolver
	implements CustomerIdentityResolver
{
	private readonly cachedResolve;

	constructor(
		inner: CustomerIdentityResolver,
		options: { maxEntries?: number; ttlMs?: number } = {},
	) {
		this.cachedResolve = withLruCache(
			(session: SessionContext) => inner.resolve(session),
			{
				maxEntries: options.maxEntries ?? DEFAULT_MAX,
				ttlMs: options.ttlMs ?? DEFAULT_TTL_MS,
				keyFn: (session) => `${session.tenantId}\0${session.userId}`,
			},
		);
	}

	resolve(session: SessionContext): Promise<string | null> {
		return this.cachedResolve.get(session);
	}
}
