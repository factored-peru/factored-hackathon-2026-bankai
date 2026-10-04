import { describe, expect, test } from "bun:test";
import type { SessionContext } from "../src/domain/session.js";
import {
	parseCustomerLinks,
	StaticCustomerIdentityResolver,
} from "../src/integrations/identity/static-customer-identity-resolver.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

const links = [
	{ tenantId: "tenant-a", userId: "user-a", customerId: "customer-1" },
	{ tenantId: "tenant-a", userId: "user-b", customerId: "customer-2" },
];

describe("StaticCustomerIdentityResolver", () => {
	test("resolves the customer linked to the session user", async () => {
		const resolver = new StaticCustomerIdentityResolver(links);

		expect(await resolver.resolve(session)).toBe("customer-1");
		expect(await resolver.resolve({ ...session, userId: "user-b" })).toBe(
			"customer-2",
		);
	});

	test("returns null for an unlinked user so callers fail closed", async () => {
		const resolver = new StaticCustomerIdentityResolver(links);

		expect(await resolver.resolve({ ...session, userId: "user-x" })).toBeNull();
	});

	test("does not reuse a link across tenants", async () => {
		const resolver = new StaticCustomerIdentityResolver(links);

		expect(
			await resolver.resolve({ ...session, tenantId: "tenant-b" }),
		).toBeNull();
	});

	test("returns null for a revoked session", async () => {
		const resolver = new StaticCustomerIdentityResolver(links);

		expect(
			await resolver.resolve({
				...session,
				revokedAt: "2026-01-01T00:30:00.000Z",
			}),
		).toBeNull();
	});
});

describe("parseCustomerLinks", () => {
	test("rejects a user linked to two customers", () => {
		expect(() =>
			parseCustomerLinks([
				{ tenantId: "t", userId: "u", customerId: "c1" },
				{ tenantId: "t", userId: "u", customerId: "c2" },
			]),
		).toThrow();
	});

	test("rejects empty or unknown fields", () => {
		expect(() =>
			parseCustomerLinks([{ tenantId: "t", userId: "u", customerId: "" }]),
		).toThrow();
		expect(() =>
			parseCustomerLinks([
				{ tenantId: "t", userId: "u", customerId: "c", extra: true },
			]),
		).toThrow();
	});
});
