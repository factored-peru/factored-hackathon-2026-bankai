import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	type DecisionState,
	defaultAgentBudget,
	type PolicyDecision,
} from "../src/domain/control/contracts.js";
import type {
	CreateSessionInput,
	SessionContext,
	SessionStore,
} from "../src/domain/session.js";
import type { ToolDefinition } from "../src/domain/tools/contracts.js";
import {
	InMemoryApprovalStore,
	InMemoryAuditSink,
	InMemoryIdempotencyStore,
	InMemoryWorkflowStore,
} from "../src/integrations/memory/in-memory-control-stores.js";
import { RegexContentPrivacyProvider } from "../src/integrations/providers/regex-content-privacy-provider.js";
import { StaticToolRegistry } from "../src/integrations/tools/static-tool-registry.js";
import { AgentControlService } from "../src/services/control-plane/agent-control-service.js";
import { AgentDecisionStage } from "../src/services/control-plane/decision-stage.js";
import { AgentInputStage } from "../src/services/control-plane/input-stage.js";
import { AgentPolicyStage } from "../src/services/control-plane/policy-stage.js";
import { AgentResponseStage } from "../src/services/control-plane/response-stage.js";
import { AgentRouteStage } from "../src/services/control-plane/route-stage.js";
import { DatabaseRouteHandler } from "../src/services/control-plane/routes/database-route-handler.js";
import { LlmRouteHandler } from "../src/services/control-plane/routes/llm-route-handler.js";
import { RagRouteHandler } from "../src/services/control-plane/routes/rag-route-handler.js";
import { RejectRouteHandler } from "../src/services/control-plane/routes/reject-route-handler.js";
import { DisclosureService } from "../src/services/disclosure/disclosure-service.js";
import { FinalResponseGuardrail } from "../src/services/disclosure/final-response-guardrail.js";
import type {
	DecisionSignalProvider,
	GuardrailProvider,
	ModelProvider,
	PolicyEngine,
} from "../src/services/ports/control.js";
import { GenerationPrivacyService } from "../src/services/privacy/generation-privacy-service.js";
import { PromptPrivacyService } from "../src/services/privacy/prompt-privacy-service.js";
import { RetrievalService } from "../src/services/retrieval/retrieval-service.js";
import { ToolExecutionService } from "../src/services/tools/tool-execution-service.js";
import { WorkflowService } from "../src/services/workflows/workflow-service.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["customer"],
	capabilities: ["movements:read"],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

const sessions: SessionStore = {
	get: async (sessionId: string) =>
		sessionId === session.sessionId ? session : null,
	create: async (_input: CreateSessionInput) => session,
	rotate: async () => session,
	revoke: async () => undefined,
};

const state: DecisionState = {
	intent: "movements",
	actorRole: "customer",
	tenantScope: "self",
	requestedTool: "get_movements",
	riskLevel: "low",
	policyFlags: [],
	accountVerified: true,
	amountBucket: null,
	evidenceQuality: "none",
	opaqueHandles: ["ref-a"],
	provenance: [],
};

const toolDefinition: ToolDefinition = {
	id: "get_movements",
	version: "1",
	capability: "movements:read",
	sideEffect: "none",
	risk: "low",
	idempotency: "required",
	timeoutMs: 100,
	approval: "policy",
	inputSchema: z.object({ accountRef: z.string() }).strict(),
	outputSchema: z.object({ count: z.number() }).strict(),
};

const toolCall = {
	kind: "tool" as const,
	call: {
		toolId: "get_movements",
		version: "1",
		arguments: { accountRef: "ref-a" },
		idempotencyKey: "key-a",
	},
};

const basePolicy: PolicyDecision = {
	outcome: "ALLOW",
	decisionId: "decision-a",
	policyId: "policy-a",
	policyVersion: "1",
	riskLevel: "low",
	reasons: [],
};

function createHarness(
	options: {
		guardrailFailure?: boolean;
		policyOutcome?: PolicyDecision["outcome"];
		modelDecision?: typeof toolCall | { kind: "respond"; response: string };
		jevAllowedRoutes?: ("llm" | "rag" | "database" | "reject")[];
	} = {},
) {
	const sequence: string[] = [];
	let modelCalls = 0;
	let executions = 0;
	let modelEvidence: unknown[] = [];
	const guardrail: GuardrailProvider = {
		inspect: async ({ surface, traceId }) => {
			sequence.push(`guardrail:${surface}`);
			const failed = options.guardrailFailure && surface === "user_input";
			return {
				provider: "test",
				status: failed ? "FAILURE" : "NO_MATCH_FOUND",
				action: failed ? "block" : "allow",
				templateVersion: "1",
				traceId,
			};
		},
	};
	const model: ModelProvider = {
		decide: async (input) => {
			modelCalls += 1;
			modelEvidence = input.evidence;
			return {
				value: options.modelDecision ?? toolCall,
				usage: { inputTokens: 10, outputTokens: 5 },
			};
		},
		composeResponse: async () => {
			sequence.push("compose");
			return {
				value: "There are two movements",
				usage: { inputTokens: 4, outputTokens: 6 },
			};
		},
	};
	const signal: DecisionSignalProvider = {
		assess: async () => ({
			provider: "jev-test",
			domain: "in_domain",
			routeHint: "database",
			domainConfidence: 0.99,
			routeConfidence: 0.99,
			allowedRoutes: options.jevAllowedRoutes,
			riskLevel: "low",
			evidenceSufficient: true,
			requiresEscalation: false,
			modelVersion: "jev-test-v1",
		}),
	};
	const policy: PolicyEngine = {
		evaluate: async () => ({
			...basePolicy,
			outcome: options.policyOutcome ?? "ALLOW",
		}),
	};
	const tools = new ToolExecutionService(
		new StaticToolRegistry([toolDefinition]),
		{
			resolve: async ({ arguments: value }) => {
				sequence.push("resolve");
				return value;
			},
		},
		{
			execute: async () => {
				executions += 1;
				sequence.push("execute");
				return { count: 2 };
			},
		},
		new InMemoryIdempotencyStore(),
	);
	const workflows = new InMemoryWorkflowStore();
	let id = 0;
	const workflowService = new WorkflowService(
		workflows,
		new InMemoryApprovalStore(),
		{ next: () => `id-${++id}` },
		{ now: () => new Date("2026-01-01T00:00:00.000Z") },
		300,
	);
	const disclosure = new DisclosureService({
		apply: async ({ value }) => {
			sequence.push("disclosure");
			return { action: "allow", value, reasonCode: "allowed" };
		},
	});
	const retrieval = new RetrievalService(
		{
			search: async () => [
				{
					content: "Policy evidence",
					tenantId: "tenant-a",
					documentId: "document-a",
					sourceId: "source-a",
					sourceType: "manual",
					documentVersion: "1",
					classification: "internal",
					createdAt: "2026-01-01T00:00:00.000Z",
					contentHash: "hash-a",
				},
			],
		},
		guardrail,
	);
	const privacyProvider = new RegexContentPrivacyProvider();
	const promptPrivacy = new PromptPrivacyService(privacyProvider);
	const generationPrivacy = new GenerationPrivacyService(privacyProvider);
	const routeStage = new AgentRouteStage([
		new LlmRouteHandler(),
		new RagRouteHandler(retrieval, promptPrivacy),
		new DatabaseRouteHandler(tools),
		new RejectRouteHandler(),
	]);
	const audit = new InMemoryAuditSink();
	const service = new AgentControlService(
		new AgentInputStage(
			sessions,
			guardrail,
			promptPrivacy,
			{
				project: async () => state,
			},
			() => new Date("2026-01-01T00:00:00.000Z"),
		),
		new AgentDecisionStage(signal, model, guardrail),
		new AgentPolicyStage(policy, workflowService),
		routeStage,
		new AgentResponseStage(
			model,
			disclosure,
			generationPrivacy,
			new FinalResponseGuardrail(guardrail),
		),
		audit,
		() => new Date("2026-01-01T00:00:00.000Z"),
	);
	return {
		service,
		workflows,
		audit,
		sequence,
		modelEvidence: () => modelEvidence,
		counts: () => ({ modelCalls, executions }),
	};
}

const request = {
	sessionId: "session-a",
	message: "show movements",
	traceId: "trace-a",
	threadId: "thread-a",
	allowedSources: ["source-a"],
	budget: defaultAgentBudget,
};

describe("agent control plane", () => {
	test("fails closed before model execution when input guardrail fails", async () => {
		const harness = createHarness({ guardrailFailure: true });
		expect(await harness.service.run(request)).toEqual({
			status: "failed",
			reasonCode: "input_guardrail_failure",
		});
		expect(harness.counts()).toEqual({ modelCalls: 0, executions: 0 });
	});

	test("never executes a policy-denied tool", async () => {
		const harness = createHarness({ policyOutcome: "DENY" });
		expect(await harness.service.run(request)).toMatchObject({
			status: "denied",
		});
		expect(harness.counts().executions).toBe(0);
		expect(harness.sequence).not.toContain("resolve");
	});

	test("persists approval without executing the proposed action", async () => {
		const harness = createHarness({ policyOutcome: "REQUIRE_APPROVAL" });
		const result = await harness.service.run(request);

		expect(result).toMatchObject({ status: "pending_approval" });
		expect(harness.counts().executions).toBe(0);
		if (result.status === "pending_approval") {
			expect((await harness.workflows.get(result.workflowId))?.status).toBe(
				"pending_approval",
			);
		}
	});

	test("stops when provider token usage exceeds the workflow budget", async () => {
		const harness = createHarness();
		expect(
			await harness.service.run({
				...request,
				budget: { ...defaultAgentBudget, maxInputTokens: 5 },
			}),
		).toEqual({
			status: "failed",
			reasonCode: "budget_inputTokens_exceeded",
		});
		expect(harness.counts().executions).toBe(0);
	});

	test("fails closed when the router conflicts with Jev's allowed routes", async () => {
		const harness = createHarness({ jevAllowedRoutes: ["llm"] });
		expect(await harness.service.run(request)).toEqual({
			status: "failed",
			reasonCode: "jev_route_conflict",
		});
		expect(harness.counts().executions).toBe(0);
	});

	test("discloses tool output before composing and sanitizing response", async () => {
		const harness = createHarness();
		expect(await harness.service.run(request)).toMatchObject({
			status: "completed",
			response: "There are two movements",
		});
		expect(harness.sequence.indexOf("disclosure")).toBeLessThan(
			harness.sequence.indexOf("compose"),
		);
		expect(harness.sequence.at(-1)).toBe("guardrail:final_response");
		expect(
			harness
				.modelEvidence()
				.some(
					(evidence) =>
						typeof evidence === "object" &&
						evidence !== null &&
						"tenantId" in evidence,
				),
		).toBe(false);
		expect(harness.audit.events).toHaveLength(1);
	});
});
