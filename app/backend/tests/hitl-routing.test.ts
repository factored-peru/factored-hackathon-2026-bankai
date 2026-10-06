import { describe, expect, test } from "bun:test";
import type { SessionContext, SessionStore } from "../src/domain/session.js";
import { createControlPlaneConversationRuntime } from "../src/integrations/evaluation/create-control-plane-conversation-runtime.js";
import { HeuristicHitlDecisionSignalProvider } from "../src/integrations/providers/heuristic-hitl-decision-signal-provider.js";
import { SafeInformationalModelProvider } from "../src/integrations/providers/safe-informational-model-provider.js";
import { DisputePolicyEngine } from "../src/services/disputes/dispute-policy-engine.js";
import type { GuardrailProvider } from "../src/services/ports/control.js";

const session: SessionContext = {
	sessionId: "session-hitl-routing",
	userId: "user-hitl",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: [
		"dispute.read",
		"dispute.transaction.read",
		"dispute.escalation.request",
	],
	sessionVersion: 1,
	createdAt: "2026-10-05T00:00:00.000Z",
	lastSeenAt: "2026-10-05T00:00:00.000Z",
	expiresAt: "2026-10-05T01:00:00.000Z",
	revokedAt: null,
};

const sessions: SessionStore = {
	get: async (sessionId) => (sessionId === session.sessionId ? session : null),
	create: async () => session,
	rotate: async () => session,
	revoke: async () => undefined,
};

const allowGuardrail: GuardrailProvider = {
	inspect: async ({ traceId }) => ({
		provider: "test",
		status: "NO_MATCH_FOUND",
		action: "allow",
		templateVersion: "1",
		traceId,
	}),
};

function runtime() {
	return createControlPlaneConversationRuntime({
		sessions,
		signal: new HeuristicHitlDecisionSignalProvider(),
		model: new SafeInformationalModelProvider(),
		guardrail: allowGuardrail,
		policy: new DisputePolicyEngine(),
		ragRuntime: null,
		now: () => new Date("2026-10-05T00:00:00.000Z"),
	});
}

describe("HITL routing (ADR 0004/0007 + DisputePolicyEngine)", () => {
	test("requiresEscalation synthesizes escalation.request → pending_approval", async () => {
		const { runner } = runtime();
		const result = await runner({
			session,
			threadId: "thread-signal",
			traceId: "trace-signal",
			message: "necesito hablar con un humano ahora",
			onDelta: async () => {},
		});
		expect(result.status).toBe("pending_approval");
		expect(result.approvalId).toBeTruthy();
		expect(result.workflowId).toBeTruthy();
	});

	test("H14 human request via heuristic provider", async () => {
		const { runner } = runtime();
		const result = await runner({
			session,
			threadId: "thread-h14",
			traceId: "trace-h14",
			message:
				"Pasame con un humano, esto ya me tiene harto y quiero hablar con alguien.",
			onDelta: async () => {},
		});
		expect(result.status).toBe("pending_approval");
	});

	test("H2 formal claim escalates; ledger-only does not", async () => {
		const { runner } = runtime();
		const formal = await runner({
			session,
			threadId: "thread-h2",
			traceId: "trace-h2",
			message: "Quiero reclamar este cargo: no autorizo la operación.",
			onDelta: async () => {},
		});
		expect(formal.status).toBe("pending_approval");

		const answerable = await runner({
			session,
			threadId: "thread-ledger",
			traceId: "trace-ledger",
			message: "Muéstrame mis movimientos recientes de la cuenta.",
			onDelta: async () => {},
		});
		expect(answerable.status).toBe("completed");
		expect(answerable.response.length).toBeGreaterThan(0);
	});

	test("confident OOD is safe completed, not HITL", async () => {
		const { runner } = runtime();
		const result = await runner({
			session,
			threadId: "thread-ood",
			traceId: "trace-ood",
			message: "¿Cómo estará el clima mañana en Bogotá?",
			onDelta: async () => {},
		});
		expect(result.status).toBe("completed");
		expect(result.response.toLowerCase()).toContain("no puedo ayudar");
	});

	test("fraud claim stays in-domain HITL (not OOD)", async () => {
		const { runner } = runtime();
		const result = await runner({
			session,
			threadId: "thread-fraud",
			traceId: "trace-fraud",
			message: "Me estafaron y transferí: quiero abrir un reclamo formal.",
			onDelta: async () => {},
		});
		expect(result.status).toBe("pending_approval");
	});
});
