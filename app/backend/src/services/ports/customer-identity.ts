import type { SessionContext } from "../../domain/session.js";

/**
 * Maps an authenticated session to the banking `customer_id` used by closed
 * data queries. The result never comes from the prompt, browser or model, and
 * `null` means "not linked": callers must fail closed and run no query.
 */
export interface CustomerIdentityResolver {
	resolve(session: SessionContext): Promise<string | null>;
}
