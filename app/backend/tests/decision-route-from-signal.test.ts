import { describe, expect, test } from "bun:test";
import {
	type DecisionSignal,
	type DecisionState,
	defaultAgentBudget,
} from "../src/domain/control/contracts.js";
import type { SessionContext } from "../src/domain/session.js";
import { BudgetTracker } from "../src/services/control-plane/budget-tracker.js";
import { AgentDecisionStage } from "../src/services/control-plane/decision-stage.js";
import type { InputStageContext } from "../src/services/control-plane/pipeline-contracts.js";
import type {
	DecisionModelProvider,
	GuardrailProvider,
} from "../src/services/ports/control.js";

const session: SessionContext = {
	sessionId: "session-route",
	userId: "user-route",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: ["dispute.read"],
	sessionVersion: 1,
	createdAt: "2026-10-05T00:00:00.000Z",
	lastSeenAt: "2026-10-05T00:00:00.000Z",
	expiresAt: "2026-10-05T01:00:00.000Z",
	revokedAt: null,
};

const state: DecisionState = {
	intent: "customer_support",
	actorRole: "customer",
	tenantScope: "self",
	requestedTool: null,
	riskLevel: "low",
	policyFlags: [],
	accountVerified: true,
	amountBucket: null,
	evidenceQuality: "none",
	opaqueHandles: [],
	provenance: [],
};

const input: InputStageContext = {
	request: {
		sessionId: session.sessionId,
		message: "ultimos movimientos",
		traceId: "trace-route",
		threadId: "thread-route",
		allowedSources: [],
		budget: defaultAgentBudget,
	},
	session,
	prompt: { content: "ultimos movimientos", replacements: [] },
	state,
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

function signal(overrides: Partial<DecisionSignal>): DecisionSignal {
	return {
		provider: "test",
		domain: "in_domain",
		routeHint: "database",
		domainConfidence: 0.99,
		routeConfidence: 0.99,
		riskLevel: "low",
		evidenceSufficient: true,
		requiresEscalation: false,
		modelVersion: "test-1",
		...overrides,
	};
}

function stage(value: DecisionSignal, routeFromSignal?: boolean) {
	const calls = { model: 0 };
	const model: DecisionModelProvider = {
		decide: async () => {
			calls.model += 1;
			return {
				value: { kind: "respond", response: "llm" },
				usage: { inputTokens: 1, outputTokens: 1 },
			};
		},
	} as DecisionModelProvider;
	const decision = new AgentDecisionStage(
		{ assess: async () => value },
		model,
		allowGuardrail,
		routeFromSignal === undefined ? {} : { routeFromSignal },
	);
	return { decision, calls };
}

const run = (decision: AgentDecisionStage) =>
	decision.execute(input, new BudgetTracker(defaultAgentBudget));

describe("AgentDecisionStage routeFromSignal", () => {
	test("is off by default: a database hint still asks the model", async () => {
		const { decision, calls } = stage(signal({}));
		const result = await run(decision);
		expect(calls.model).toBe(1);
		expect("route" in result && result.route.route).toBe("llm");
	});

	test("routes a confident database hint without calling the model", async () => {
		const { decision, calls } = stage(signal({}), true);
		const result = await run(decision);
		expect(calls.model).toBe(0);
		expect("route" in result && result.route.route).toBe("database");
		expect("modelDecision" in result && result.modelDecision.kind).toBe(
			"route",
		);
	});

	test("routes a confident rag hint with the de-identified query", async () => {
		const { decision, calls } = stage(signal({ routeHint: "rag" }), true);
		const result = await run(decision);
		expect(calls.model).toBe(0);
		expect("route" in result && result.route).toEqual({
			route: "rag",
			query: "ultimos movimientos",
		});
	});

	test("an llm hint still goes to the model", async () => {
		const { decision, calls } = stage(signal({ routeHint: "llm" }), true);
		await run(decision);
		expect(calls.model).toBe(1);
	});

	test("low route confidence falls back to the model", async () => {
		const { decision, calls } = stage(signal({ routeConfidence: 0.5 }), true);
		await run(decision);
		expect(calls.model).toBe(1);
	});

	test("a hint outside allowedRoutes is not routed", async () => {
		const { decision, calls } = stage(signal({ allowedRoutes: ["llm"] }), true);
		await run(decision);
		expect(calls.model).toBe(1);
	});

	test("out of domain keeps winning over the hint", async () => {
		const { decision, calls } = stage(
			signal({ domain: "out_of_domain" }),
			true,
		);
		const result = await run(decision);
		expect(calls.model).toBe(0);
		expect("route" in result && result.route.route).toBe("out_of_domain");
	});

	test("ambiguous domain clarifies instead of routing", async () => {
		const { decision } = stage(signal({ domain: "ambiguous" }), true);
		const result = await run(decision);
		expect("route" in result && result.route.route).toBe("clarify");
	});

	test("escalation keeps priority over a retrieval hint", async () => {
		const { decision } = stage(signal({ requiresEscalation: true }), true);
		const result = await run(decision);
		expect(
			"modelDecision" in result &&
				result.modelDecision.kind === "tool" &&
				result.modelDecision.call.toolId,
		).toBe("escalation.request");
	});
});
