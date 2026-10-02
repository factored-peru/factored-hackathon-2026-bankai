import { describe, expect, test } from "bun:test";
import { z } from "zod";
import {
	type DecisionState,
	defaultAgentBudget,
	type ModelDecision,
	type PolicyDecision,
} from "../src/domain/control/contracts.js";
import type { SessionContext, SessionStore } from "../src/domain/session.js";
import type { ToolDefinition } from "../src/domain/tools/contracts.js";
import {
	InMemoryApprovalStore,
	InMemoryAuditSink,
	InMemoryClarificationStore,
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
import { ClarificationRouteHandler } from "../src/services/control-plane/routes/clarification-route-handler.js";
import { DatabaseRouteHandler } from "../src/services/control-plane/routes/database-route-handler.js";
import { LlmRouteHandler } from "../src/services/control-plane/routes/llm-route-handler.js";
import { OutOfDomainRouteHandler } from "../src/services/control-plane/routes/out-of-domain-route-handler.js";
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
import type {
	ContentPrivacyProvider,
	PrivacySurface,
} from "../src/services/ports/privacy.js";
import { GenerationPrivacyService } from "../src/services/privacy/generation-privacy-service.js";
import { PromptPrivacyService } from "../src/services/privacy/prompt-privacy-service.js";
import { RetrievalService } from "../src/services/retrieval/retrieval-service.js";
import { SessionBoundArgumentResolver } from "../src/services/tools/session-bound-argument-resolver.js";
import { ToolExecutionService } from "../src/services/tools/tool-execution-service.js";
import { WorkflowService } from "../src/services/workflows/workflow-service.js";

const session: SessionContext = {
	sessionId: "session-behavior",
	userId: "user-behavior",
	tenantId: "tenant-behavior",
	scopes: [],
	roles: ["customer"],
	capabilities: ["movements:read"],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
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
	opaqueHandles: ["handle-account"],
	provenance: [],
};

const policyDecision: PolicyDecision = {
	outcome: "ALLOW",
	decisionId: "decision-behavior",
	policyId: "policy-behavior",
	policyVersion: "1",
	riskLevel: "low",
	reasons: [],
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
	outputSchema: z.object({ count: z.number(), email: z.string() }).strict(),
};

type Route =
	| "llm"
	| "rag"
	| "database"
	| "reject"
	| "out_of_domain"
	| "ambiguous";

class RecordingPrivacyProvider implements ContentPrivacyProvider {
	private readonly delegate = new RegexContentPrivacyProvider();

	constructor(private readonly sequence: string[]) {}

	deidentify(input: {
		session: SessionContext;
		surface: PrivacySurface;
		content: string;
		traceId: string;
	}) {
		this.sequence.push(`privacy:${input.surface}`);
		return this.delegate.deidentify(input);
	}
}

function createHarness(route: Route) {
	const sequence: string[] = [];
	const externalInputs: string[] = [];
	const guardrailInputs: string[] = [];
	const retrieverCalls: string[] = [];
	let sessionReads = 0;
	let executedArguments: unknown = null;
	let generatedContext = "";

	const sessions: SessionStore = {
		get: async (sessionId) => {
			sequence.push("session:get");
			sessionReads += 1;
			return sessionId === session.sessionId ? session : null;
		},
		create: async () => session,
		rotate: async () => session,
		revoke: async () => undefined,
	};

	const guardrail: GuardrailProvider = {
		inspect: async ({ surface, content, traceId }) => {
			sequence.push(`guardrail:${surface}`);
			guardrailInputs.push(content);
			return {
				provider: "test-model-armor",
				status: "NO_MATCH_FOUND" as const,
				action: "allow" as const,
				templateVersion: "test-v1",
				traceId,
			};
		},
	};

	const model: ModelProvider = {
		decide: async ({ prompt }) => {
			sequence.push("llm:decide");
			externalInputs.push(prompt);
			const value: ModelDecision =
				route === "database"
					? {
							kind: "route",
							route: "database",
							call: {
								toolId: "get_movements",
								version: "1",
								arguments: { accountRef: "handle-account" },
								idempotencyKey: "behavior-key",
							},
						}
					: route === "rag"
						? { kind: "route", route: "rag", query: "movement policy" }
						: route === "reject"
							? {
									kind: "route",
									route: "reject",
									reasonCode: "unsupported_request",
								}
							: { kind: "route", route: "llm" };
			return { value, usage: { inputTokens: 10, outputTokens: 5 } };
		},
		composeResponse: async ({ prompt, authorizedResult }) => {
			sequence.push("llm:generate");
			externalInputs.push(prompt);
			generatedContext = String(authorizedResult);
			const token = generatedContext.match(/\[\[PII_[A-Z_]+_[0-9]+\]\]/)?.[0];
			return {
				value: token ? `Resultado autorizado: ${token}` : "Respuesta generada",
				usage: { inputTokens: 4, outputTokens: 6 },
			};
		},
	};

	const signal: DecisionSignalProvider = {
		assess: async ({ prompt }) => {
			sequence.push("jev:assess");
			externalInputs.push(prompt);
			return {
				provider: "jev-test",
				domain:
					route === "out_of_domain"
						? "out_of_domain"
						: route === "ambiguous"
							? "ambiguous"
							: "in_domain",
				routeHint:
					route === "database"
						? "database"
						: route === "ambiguous"
							? "clarify"
							: "llm",
				domainConfidence: 0.99,
				routeConfidence: 0.99,
				riskLevel: "low",
				evidenceSufficient: true,
				requiresEscalation: false,
				modelVersion: "test-v1",
			};
		},
	};

	const policy: PolicyEngine = {
		evaluate: async () => {
			sequence.push("policy:evaluate");
			return policyDecision;
		},
	};

	const resolver = new SessionBoundArgumentResolver(
		[
			{
				toolId: "get_movements",
				version: "1",
				bindings: [
					{
						argumentName: "accountRef",
						purpose: "read_movements",
						audience: "get_movements",
					},
				],
			},
		],
		sessions,
		{
			resolveHandle: async ({ handle }) => {
				sequence.push("session:resolve-handle");
				if (handle !== "handle-account") {
					throw new Error("unknown handle");
				}
				return "account-private-value";
			},
			mintHandle: async () => "unused",
		},
	);

	const tools = new ToolExecutionService(
		new StaticToolRegistry([toolDefinition]),
		resolver,
		{
			execute: async ({ arguments: value }) => {
				sequence.push("database:execute");
				executedArguments = value;
				return { count: 2, email: "ana@example.test" };
			},
		},
		new InMemoryIdempotencyStore(),
	);

	const retrieval = new RetrievalService(
		{
			search: async (query) => {
				sequence.push("rag:retrieve");
				retrieverCalls.push(query.query);
				return [
					{
						content: "Policy contact ana@example.test",
						tenantId: session.tenantId,
						documentId: "policy-1",
						sourceId: "policy-source",
						sourceType: "manual",
						documentVersion: "1",
						classification: "internal",
						createdAt: "2026-01-01T00:00:00.000Z",
						contentHash: "policy-hash",
					},
				];
			},
		},
		guardrail,
	);

	const disclosure = new DisclosureService({
		apply: async ({ value }) => {
			sequence.push("disclosure:authorize");
			return { action: "allow", value, reasonCode: "allowed" };
		},
	});
	const workflows = new WorkflowService(
		new InMemoryWorkflowStore(),
		new InMemoryApprovalStore(),
		{ next: () => "unused-id" },
		{ now: () => new Date("2026-01-01T00:00:00.000Z") },
		300,
		new InMemoryClarificationStore(),
	);
	const promptPrivacy = new PromptPrivacyService(
		new RecordingPrivacyProvider(sequence),
	);
	const generationPrivacy = new GenerationPrivacyService(
		new RecordingPrivacyProvider(sequence),
	);
	const audit = new InMemoryAuditSink();
	const routeStage = new AgentRouteStage([
		new LlmRouteHandler(),
		new RagRouteHandler(retrieval, promptPrivacy),
		new DatabaseRouteHandler(tools),
		new RejectRouteHandler(),
		new ClarificationRouteHandler(workflows),
		new OutOfDomainRouteHandler(),
	]);
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
		new AgentPolicyStage(policy, workflows),
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
		sequence,
		externalInputs,
		guardrailInputs,
		retrieverCalls,
		get sessionReads() {
			return sessionReads;
		},
		get executedArguments() {
			return executedArguments;
		},
		get generatedContext() {
			return generatedContext;
		},
		audit,
	};
}

const request = {
	sessionId: session.sessionId,
	message: "Necesito ayuda; mi correo es ana@example.test",
	traceId: "trace-behavior",
	threadId: "thread-behavior",
	allowedSources: ["policy-source"],
	budget: defaultAgentBudget,
};

describe("formal behavioral agent flow", () => {
	test("runs session → guardrail → no-PII prompt → Jev → database → replacement → response", async () => {
		const harness = createHarness("database");
		const result = await harness.service.run(request);

		expect(result).toMatchObject({
			status: "completed",
			response: "Resultado autorizado: [EMAIL_REDACTED]",
		});
		expect(harness.sessionReads).toBe(2);
		expect(harness.executedArguments).toEqual({
			accountRef: "account-private-value",
		});
		expect(harness.generatedContext).not.toContain("ana@example.test");
		expect(
			harness.externalInputs.every(
				(value) => !value.includes("ana@example.test"),
			),
		).toBe(true);
		expect(
			harness.guardrailInputs.every(
				(value) => !value.includes("ana@example.test"),
			),
		).toBe(true);
		expect(harness.sequence.indexOf("privacy:user_prompt")).toBeLessThan(
			harness.sequence.indexOf("guardrail:user_input"),
		);
		expect(harness.sequence.indexOf("privacy:user_prompt")).toBeLessThan(
			harness.sequence.indexOf("jev:assess"),
		);
		expect(harness.sequence.indexOf("jev:assess")).toBeLessThan(
			harness.sequence.indexOf("llm:decide"),
		);
		expect(harness.sequence.indexOf("policy:evaluate")).toBeLessThan(
			harness.sequence.indexOf("session:resolve-handle"),
		);
		expect(harness.sequence.indexOf("database:execute")).toBeLessThan(
			harness.sequence.indexOf("llm:generate"),
		);
		expect(harness.sequence.at(-1)).toBe("guardrail:final_response");
		expect(harness.audit.events).toHaveLength(1);
	});

	test("selects RAG only after the typed route and sanitizes retrieved content", async () => {
		const harness = createHarness("rag");
		const result = await harness.service.run(request);

		expect(result).toMatchObject({
			status: "completed",
			response: "Resultado autorizado: [EMAIL_REDACTED]",
		});
		expect(harness.retrieverCalls).toEqual(["movement policy"]);
		expect(harness.sequence.indexOf("llm:decide")).toBeLessThan(
			harness.sequence.indexOf("rag:retrieve"),
		);
		expect(harness.sequence).not.toContain("database:execute");
		expect(
			harness.externalInputs.every(
				(value) => !value.includes("ana@example.test"),
			),
		).toBe(true);
	});

	test("uses direct LLM generation without RAG or database", async () => {
		const harness = createHarness("llm");
		const result = await harness.service.run(request);

		expect(result).toMatchObject({
			status: "completed",
			response: "Respuesta generada",
		});
		expect(harness.sequence).not.toContain("rag:retrieve");
		expect(harness.sequence).not.toContain("database:execute");
	});

	test("rejects without recovery, tool execution or generation", async () => {
		const harness = createHarness("reject");
		const result = await harness.service.run(request);

		expect(result).toMatchObject({
			status: "denied",
			reasonCode: "unsupported_request",
		});
		expect(harness.sequence).not.toContain("rag:retrieve");
		expect(harness.sequence).not.toContain("database:execute");
		expect(harness.sequence).not.toContain("llm:generate");
	});

	test("stops at Jev for out-of-domain requests", async () => {
		const harness = createHarness("out_of_domain");
		const result = await harness.service.run(request);

		expect(result).toMatchObject({
			status: "completed",
			response:
				"No puedo ayudar con esa solicitud. Puedo ayudarte con soporte bancario autorizado.",
		});
		expect(harness.sequence).not.toContain("llm:decide");
		expect(harness.sequence).not.toContain("rag:retrieve");
		expect(harness.sequence).not.toContain("database:execute");
		expect(harness.sequence).not.toContain("llm:generate");
		expect(harness.sequence).not.toContain("policy:evaluate");
	});

	test("persists a clarification before any downstream route", async () => {
		const harness = createHarness("ambiguous");
		const result = await harness.service.run(request);

		expect(result).toMatchObject({
			status: "pending_clarification",
			question: "¿Puedes precisar qué necesitas sobre soporte bancario?",
		});
		expect(harness.sequence).not.toContain("llm:decide");
		expect(harness.sequence).not.toContain("rag:retrieve");
		expect(harness.sequence).not.toContain("database:execute");
		expect(harness.sequence).not.toContain("llm:generate");
		expect(harness.sequence).not.toContain("policy:evaluate");
	});

	test("blocks unknown replacement tokens and raw sensitive values", async () => {
		const privacy = new GenerationPrivacyService(
			new RegexContentPrivacyProvider(),
		);
		const prepared = await privacy.prepare({
			session,
			purpose: "answer_user",
			value: { email: "ana@example.test" },
			traceId: "trace-privacy",
		});

		expect(
			await privacy.replaceValidated({
				session,
				draft: "[[PII_GENERATION_CONTEXT_999]]",
				deidentified: prepared,
				traceId: "trace-privacy",
			}),
		).toEqual({ status: "blocked", reasonCode: "unknown_replacement_token" });
		expect(JSON.stringify(prepared)).not.toContain("ana@example.test");
		expect(
			await privacy.replaceValidated({
				session,
				draft: "ana@example.test",
				deidentified: prepared,
				traceId: "trace-privacy",
			}),
		).toEqual({
			status: "blocked",
			reasonCode: "unregistered_sensitive_value_in_generation",
		});
	});
});
