import { describe, expect, test } from "bun:test";
import type {
	DecisionState,
	PolicyDecision,
} from "../src/domain/control/contracts.js";
import type { SessionContext } from "../src/domain/session.js";
import {
	InMemoryApprovalStore,
	InMemoryClarificationStore,
	InMemoryWorkflowStore,
} from "../src/integrations/memory/in-memory-control-stores.js";
import { WorkflowService } from "../src/services/workflows/workflow-service.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["customer"],
	capabilities: ["case:write"],
	sessionVersion: 3,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

const state: DecisionState = {
	intent: "open_case",
	actorRole: "customer",
	tenantScope: "self",
	requestedTool: "open_case",
	riskLevel: "high",
	policyFlags: [],
	accountVerified: true,
	amountBucket: null,
	evidenceQuality: "high",
	opaqueHandles: ["ref-a"],
	provenance: [],
};

const requireApproval: PolicyDecision = {
	outcome: "REQUIRE_APPROVAL",
	decisionId: "decision-a",
	policyId: "policy-a",
	policyVersion: "1",
	riskLevel: "high",
	reasons: ["human_review"],
};

function setup() {
	let now = new Date("2026-01-01T00:00:00.000Z");
	let sequence = 0;
	const workflows = new InMemoryWorkflowStore();
	const approvals = new InMemoryApprovalStore();
	const clarifications = new InMemoryClarificationStore();
	const service = new WorkflowService(
		workflows,
		approvals,
		{ next: () => `id-${++sequence}` },
		{ now: () => now },
		300,
		clarifications,
	);
	return {
		service,
		workflows,
		approvals,
		clarifications,
		setNow: (value: Date) => (now = value),
	};
}

describe("durable workflow foundation", () => {
	test("persists before approval and consumes approval once", async () => {
		const { service, workflows } = setup();
		const pending = await service.requestApproval({
			session,
			threadId: "thread-a",
			call: {
				toolId: "open_case",
				version: "1",
				arguments: { accountRef: "ref-a" },
				idempotencyKey: "key-a",
			},
			decisionState: state,
			policyDecision: requireApproval,
		});

		expect((await workflows.get(pending.workflowId))?.status).toBe(
			"pending_approval",
		);
		expect(await service.decideApproval(pending.approvalId, "approved")).toBe(
			true,
		);
		const currentPolicy = { ...requireApproval, outcome: "ALLOW" as const };
		expect(
			await service.resume({
				approvalId: pending.approvalId,
				session,
				currentPolicy,
			}),
		).toMatchObject({ status: "ready" });
		expect(
			await service.resume({
				approvalId: pending.approvalId,
				session,
				currentPolicy,
			}),
		).toEqual({ status: "rejected", reasonCode: "approval_not_usable" });
	});

	test("rejects a rotated session before resuming", async () => {
		const { service } = setup();
		const pending = await service.requestApproval({
			session,
			threadId: "thread-a",
			call: {
				toolId: "open_case",
				version: "1",
				arguments: { accountRef: "ref-a" },
				idempotencyKey: "key-a",
			},
			decisionState: state,
			policyDecision: requireApproval,
		});
		await service.decideApproval(pending.approvalId, "approved");

		expect(
			await service.resume({
				approvalId: pending.approvalId,
				session: { ...session, sessionVersion: 4 },
				currentPolicy: { ...requireApproval, outcome: "ALLOW" },
			}),
		).toEqual({ status: "rejected", reasonCode: "session_changed" });
	});

	test("rejects expired approval", async () => {
		const { service, setNow } = setup();
		const pending = await service.requestApproval({
			session,
			threadId: "thread-a",
			call: {
				toolId: "open_case",
				version: "1",
				arguments: { accountRef: "ref-a" },
				idempotencyKey: "key-a",
			},
			decisionState: state,
			policyDecision: requireApproval,
		});
		setNow(new Date("2026-01-01T00:06:00.000Z"));

		expect(await service.decideApproval(pending.approvalId, "approved")).toBe(
			false,
		);
	});

	test("rejects an approval when the active policy version changed", async () => {
		const { service } = setup();
		const pending = await service.requestApproval({
			session,
			threadId: "thread-a",
			call: {
				toolId: "open_case",
				version: "1",
				arguments: { accountRef: "ref-a" },
				idempotencyKey: "key-a",
			},
			decisionState: state,
			policyDecision: requireApproval,
		});
		await service.decideApproval(pending.approvalId, "approved");

		expect(
			await service.resume({
				approvalId: pending.approvalId,
				session,
				currentPolicy: {
					...requireApproval,
					outcome: "ALLOW",
					policyVersion: "2",
				},
			}),
		).toEqual({ status: "rejected", reasonCode: "policy_changed" });
	});

	test("persists and answers a clarification with the current session", async () => {
		const { service, clarifications } = setup();
		const pending = await service.requestClarification({
			session,
			threadId: "thread-a",
			question: "¿Qué cuenta autorizada deseas consultar?",
			decisionState: state,
			policyDecision: { ...requireApproval, outcome: "ALLOW" },
		});

		expect((await clarifications.get(pending.clarificationId))?.status).toBe(
			"pending",
		);
		expect(
			await service.answerClarification({
				clarificationId: pending.clarificationId,
				session,
				answer: { content: "Cuenta terminada en 1234", replacements: [] },
			}),
		).toBe(true);
		expect((await clarifications.get(pending.clarificationId))?.status).toBe(
			"answered",
		);
		expect(
			await service.answerClarification({
				clarificationId: pending.clarificationId,
				session,
				answer: { content: "Otra respuesta", replacements: [] },
			}),
		).toBe(false);
	});
});
