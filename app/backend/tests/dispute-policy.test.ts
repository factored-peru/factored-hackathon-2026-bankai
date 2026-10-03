import { describe, expect, test } from "bun:test";
import type {
	DecisionState,
	ModelDecision,
} from "../src/domain/control/contracts.js";
import type { SessionContext } from "../src/domain/session.js";
import { DisputePolicyEngine } from "../src/services/disputes/dispute-policy-engine.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["client"],
	capabilities: ["dispute.escalation.request"],
	sessionVersion: 1,
	createdAt: "2026-10-02T00:00:00.000Z",
	lastSeenAt: "2026-10-02T00:00:00.000Z",
	expiresAt: "2026-10-02T01:00:00.000Z",
	revokedAt: null,
};
const modelDecision: ModelDecision = { kind: "respond", response: "safe" };
const state = (requestedTool: string): DecisionState => ({
	intent: "dispute",
	actorRole: "client",
	tenantScope: "self",
	requestedTool,
	riskLevel: "low",
	policyFlags: [],
	accountVerified: true,
	amountBucket: null,
	evidenceQuality: "high",
	opaqueHandles: [],
	provenance: [],
});

describe("DisputePolicyEngine", () => {
	test("requires approval for an allowed mock escalation", async () => {
		const result = await new DisputePolicyEngine().evaluate({
			session,
			state: state("escalation.request"),
			modelDecision,
			signal: null,
		});
		expect(result.outcome).toBe("REQUIRE_APPROVAL");
	});

	test("denies bank dispute submission even if a prompt asks for it", async () => {
		const result = await new DisputePolicyEngine().evaluate({
			session,
			state: state("dispute.submit"),
			modelDecision,
			signal: null,
		});
		expect(result).toMatchObject({
			outcome: "DENY",
			reasons: ["bank_dispute_action_not_supported"],
		});
	});
});
