import { describe, expect, test } from "bun:test";
import type {
	DecisionState,
	ModelDecision,
} from "../src/domain/control/contracts.js";
import {
	DISPUTE_CAPABILITY_MATRIX_VERSION,
	disputeCapabilityEntrySchema,
	disputeCapabilityMatrix,
	disputeCapabilityMatrixByActionId,
} from "../src/domain/disputes/capability-matrix.js";
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
		expect(result.policyVersion).toBe(DISPUTE_CAPABILITY_MATRIX_VERSION);
	});

	test("accepts demo customer alias for client escalation capability", async () => {
		const result = await new DisputePolicyEngine().evaluate({
			session: {
				...session,
				roles: ["customer"],
				capabilities: ["dispute.escalation.request"],
			},
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

	test("versions every capability row with Zod fields and no bank effect", () => {
		expect(disputeCapabilityMatrix.length).toBeGreaterThanOrEqual(5);
		for (const entry of disputeCapabilityMatrix) {
			expect(disputeCapabilityEntrySchema.parse(entry).version).toBe(
				DISPUTE_CAPABILITY_MATRIX_VERSION,
			);
			expect(entry.mock.effect).toBe("none");
			if (entry.outcome === "DENY") {
				expect(entry.capability).toBe("");
				expect(entry.roles).toEqual([]);
				expect(entry.mock.provenance).toBe("not_applicable");
			} else {
				expect(entry.capability.length).toBeGreaterThan(0);
				expect(entry.allowedData.length).toBeGreaterThan(0);
				expect(entry.requiredEvidence.length).toBeGreaterThan(0);
			}
		}
		expect(disputeCapabilityMatrixByActionId["dispute.cancel"]?.outcome).toBe(
			"DENY",
		);
	});
});
