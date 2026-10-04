import { describe, expect, test } from "bun:test";
import type { SessionContext } from "../src/domain/session.js";
import {
	InMemoryDisputeEventSink,
	InMemoryDisputeSupportStore,
} from "../src/integrations/memory/in-memory-dispute-support-store.js";
import { DisputeSupportService } from "../src/services/disputes/dispute-support-service.js";

const now = "2026-10-02T00:00:00.000Z";
const client: SessionContext = {
	sessionId: "session-client",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["client"],
	capabilities: ["dispute.escalation.request"],
	sessionVersion: 1,
	createdAt: now,
	lastSeenAt: now,
	expiresAt: "2026-10-02T01:00:00.000Z",
	revokedAt: null,
};

const operator: SessionContext = {
	...client,
	sessionId: "session-operator",
	userId: "operator-a",
	roles: ["operator"],
	capabilities: ["dispute.escalation.decide"],
};

function createService() {
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
	const events = new InMemoryDisputeEventSink();
	const ids = ["approval-a", "action-a", "receipt-a"];
	return {
		service: new DisputeSupportService(
			store,
			events,
			() => new Date(now),
			() => ids.shift() ?? "unexpected",
		),
		events,
	};
}

describe("DisputeSupportService", () => {
	test("returns only evidence owned by the current tenant and user", async () => {
		const { service } = createService();
		expect(await service.transaction(client, "txn-a")).toMatchObject({
			status: "ok",
		});
		expect(
			await service.transaction({ ...client, userId: "other" }, "txn-a"),
		).toEqual({
			status: "forbidden",
			reasonCode: "transaction_not_authorized",
		});
		expect(
			await service.dispute({ ...client, tenantId: "tenant-b" }, "dispute-a"),
		).toEqual({ status: "forbidden", reasonCode: "dispute_not_authorized" });
	});

	test("creates only a pending mock escalation and requires an operator decision", async () => {
		const { service, events } = createService();
		const pending = await service.requestEscalation(client, {
			caseId: "case-a",
			reasonCode: "transaction_declined",
		});
		expect(pending).toMatchObject({
			status: "ok",
			value: { approvalId: "approval-a", case: { status: "pending_approval" } },
		});
		if (pending.status !== "ok") throw new Error("expected pending escalation");
		expect(
			await service.decideEscalation(client, pending.value.approvalId, {
				decision: "approved",
			}),
		).toEqual({ status: "forbidden", reasonCode: "capability_missing" });
		expect(
			await service.decideEscalation(operator, pending.value.approvalId, {
				decision: "approved",
			}),
		).toMatchObject({
			status: "ok",
			value: {
				case: { status: "escalated" },
				action: {
					effect: "none",
					status: "verified_mock_escalation",
					provenance: "local_mock",
				},
			},
		});
		expect(events.events.map((event) => event.type)).toEqual([
			"case.updated",
			"escalation.pending",
			"approval.decided",
			"case.updated",
			"verified_action",
		]);
	});

	test("never exposes a bank submission operation", async () => {
		const { service } = createService();
		expect(
			await service.requestEscalation(
				{ ...client, capabilities: [] },
				{ caseId: "case-a", reasonCode: "other" },
			),
		).toEqual({ status: "forbidden", reasonCode: "capability_missing" });
	});
});
