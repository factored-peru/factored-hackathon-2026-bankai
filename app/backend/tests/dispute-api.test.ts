import { describe, expect, test } from "bun:test";
import { env, envSchema } from "../src/config/env.js";
import { buildServer } from "../src/http/server.js";
import {
	InMemoryDisputeEventSink,
	InMemoryDisputeSupportStore,
} from "../src/integrations/memory/in-memory-dispute-support-store.js";
import { InMemorySessionStore } from "../src/integrations/memory/in-memory-session-store.js";
import { DisputeSupportService } from "../src/services/disputes/dispute-support-service.js";
import type { IdentityVerifier } from "../src/services/ports/control.js";
import { SessionAuthService } from "../src/services/session-auth-service.js";

const now = "2026-10-02T00:00:00.000Z";

function runtime() {
	const identities: IdentityVerifier = {
		async verify(token) {
			if (token === "operator-token")
				return {
					userId: "operator-a",
					tenantId: "tenant-a",
					roles: ["operator"],
					capabilities: ["dispute.escalation.decide"],
					authStrength: "test",
				};
			if (token === "client-token")
				return {
					userId: "user-a",
					tenantId: "tenant-a",
					roles: ["client"],
					capabilities: ["dispute.escalation.request"],
					authStrength: "test",
				};
			throw new Error("invalid token");
		},
	};
	const sessions = new InMemorySessionStore(
		() => new Date(now),
		3600,
		(() => {
			let id = 0;
			return () => `session-${++id}`;
		})(),
	);
	const store = new InMemoryDisputeSupportStore({
		transactions: [
			{
				transactionId: "txn-a",
				tenantId: "tenant-a",
				ownerUserId: "user-a",
				status: "declined",
				amountBucket: "medium",
				currency: "PEN",
				provenance: "synthetic_local_fixture",
				version: "dispute-demo-v1",
			},
		],
		disputes: [
			{
				disputeId: "dispute-a",
				transactionId: "txn-a",
				tenantId: "tenant-a",
				ownerUserId: "user-a",
				status: "open",
				priority: "normal",
				provenance: "synthetic_local_fixture",
				version: "dispute-demo-v1",
			},
		],
		cases: [
			{
				caseId: "case-a",
				disputeId: "dispute-a",
				tenantId: "tenant-a",
				ownerUserId: "user-a",
				status: "open",
				createdAt: now,
				updatedAt: now,
				provenance: "synthetic_local_fixture",
				version: "dispute-demo-v1",
			},
		],
	});
	return {
		auth: new SessionAuthService(identities, sessions, () => new Date(now)),
		support: new DisputeSupportService(
			store,
			new InMemoryDisputeEventSink(),
			() => new Date(now),
		),
	};
}

async function startSession(
	app: Awaited<ReturnType<typeof buildServer>>,
	token: string,
): Promise<string> {
	const response = await app.inject({
		method: "POST",
		url: "/v1/sessions",
		headers: { authorization: `Bearer ${token}` },
	});
	expect(response.statusCode).toBe(201);
	return String(response.headers["set-cookie"]).split(";")[0] ?? "";
}

describe("Dispute Transaction Support HTTP API", () => {
	test("creates an opaque session and reads only authorized synthetic evidence", async () => {
		const app = await buildServer({ env, disputeRuntime: runtime() });
		const cookie = await startSession(app, "client-token");
		const response = await app.inject({
			method: "GET",
			url: "/v1/transactions/txn-a",
			headers: { cookie },
		});
		expect(response.statusCode).toBe(200);
		expect(response.json()).toMatchObject({
			transactionId: "txn-a",
			provenance: "synthetic_local_fixture",
		});
		expect(response.json()).not.toHaveProperty("tenantId");
		expect(response.json()).not.toHaveProperty("ownerUserId");
	});

	test("requires an operator to complete mock escalation", async () => {
		const app = await buildServer({ env, disputeRuntime: runtime() });
		const clientCookie = await startSession(app, "client-token");
		const pending = await app.inject({
			method: "POST",
			url: "/v1/dispute-cases/case-a/escalations",
			headers: { cookie: clientCookie },
			payload: { reasonCode: "transaction_declined" },
		});
		expect(pending.statusCode).toBe(200);
		const operatorCookie = await startSession(app, "operator-token");
		const approval = await app.inject({
			method: "POST",
			url: `/v1/approvals/${pending.json().approvalId}/decisions`,
			headers: { cookie: operatorCookie },
			payload: { decision: "approved" },
		});
		expect(approval.statusCode).toBe(200);
		expect(approval.json()).toMatchObject({
			action: { effect: "none", status: "verified_mock_escalation" },
		});
	});

	test("fails closed when no dispute runtime is configured", async () => {
		const app = await buildServer({
			env: envSchema.parse({ APP_ENV: "dev", DEMO_AUTH_ENABLED: false }),
		});
		const response = await app.inject({
			method: "POST",
			url: "/v1/sessions",
			headers: { authorization: "Bearer anything" },
		});
		expect(response.statusCode).toBe(502);
		expect(response.headers["x-error-code"]).toBe("SVC-CORE-5001");
	});
});
