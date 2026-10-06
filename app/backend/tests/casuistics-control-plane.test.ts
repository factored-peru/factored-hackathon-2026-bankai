import { describe, expect, test } from "bun:test";
import {
	type DecisionState,
	defaultAgentBudget,
	type PolicyDecision,
} from "../src/domain/control/contracts.js";
import type { SessionContext, SessionStore } from "../src/domain/session.js";
import { createControlPlaneConversationRuntime } from "../src/integrations/evaluation/create-control-plane-conversation-runtime.js";
import { InMemoryAttachmentStore } from "../src/integrations/memory/in-memory-attachment-store.js";
import {
	InMemoryApprovalStore,
	InMemoryClarificationStore,
	InMemoryWorkflowStore,
} from "../src/integrations/memory/in-memory-control-stores.js";
import {
	InMemoryConversationEventPublisher,
	InMemoryConversationStore,
} from "../src/integrations/memory/in-memory-conversation-store.js";
import type { AgentControlService } from "../src/services/control-plane/agent-control-service.js";
import { BudgetTracker } from "../src/services/control-plane/budget-tracker.js";
import { capabilityRetrievalPolicy } from "../src/services/control-plane/capability-retrieval-policy.js";
import {
	clarificationQuestionFor,
	mapRagTerminal,
} from "../src/services/control-plane/map-rag-terminal.js";
import { allowRetrievalPolicy } from "../src/services/control-plane/rag-state-graph.js";
import { FactualRagRouteHandler } from "../src/services/control-plane/routes/factual-rag-route-handler.js";
import { createControlPlaneConversationRunner } from "../src/services/conversations/control-plane-conversation-runner.js";
import { ConversationService } from "../src/services/conversations/conversation-service.js";
import { DisputePolicyEngine } from "../src/services/disputes/dispute-policy-engine.js";
import type {
	DecisionSignalProvider,
	GuardrailProvider,
	ModelProvider,
	PolicyEngine,
} from "../src/services/ports/control.js";
import type { BaseRagCatalogRepository } from "../src/services/retrieval/rag-catalog.js";
import type { StructuredQuerySelector } from "../src/services/retrieval/structured-rag.js";
import { WorkflowService } from "../src/services/workflows/workflow-service.js";

const session: SessionContext = {
	sessionId: "session-casuistics",
	userId: "user-casuistics",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: ["dispute.read", "dispute.escalation.request"],
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

const allowGuardrail: GuardrailProvider = {
	inspect: async ({ traceId }) => ({
		provider: "test",
		status: "NO_MATCH_FOUND",
		action: "allow",
		templateVersion: "1",
		traceId,
	}),
};

const sessions: SessionStore = {
	get: async (sessionId) => (sessionId === session.sessionId ? session : null),
	create: async () => session,
	rotate: async () => session,
	revoke: async () => undefined,
};

const evidence = [
	{
		content: "authorized aggregate",
		documentRef: "doc-a",
		sourceType: "catalog",
		classification: "internal" as const,
		contentHash: "hash-a",
	},
];

describe("capabilityRetrievalPolicy", () => {
	test("allows authorized reads, clarifies empty catalog, denies without capability", async () => {
		const catalog = {
			kind: "structured" as const,
			version: "v1",
			entries: [
				{
					id: "q1",
					version: "v1",
					allowedRoles: ["customer"],
					parameters: [],
				},
			],
		};
		expect(
			await capabilityRetrievalPolicy.authorize({
				route: "database",
				query: "x",
				session,
				catalog,
				traceId: "t",
			}),
		).toBe("allow");
		expect(
			await capabilityRetrievalPolicy.authorize({
				route: "database",
				query: "x",
				session,
				catalog: { ...catalog, entries: [] },
				traceId: "t",
			}),
		).toBe("clarify");
		expect(
			await capabilityRetrievalPolicy.authorize({
				route: "relations",
				query: "x",
				session: { ...session, capabilities: [] },
				catalog,
				traceId: "t",
			}),
		).toBe("deny");
	});
});

describe("mapRagTerminal", () => {
	test("maps ready, clarify, and deny terminals", () => {
		expect(mapRagTerminal({ terminalReason: null, evidence })).toEqual({
			kind: "ready",
			evidence,
		});
		expect(
			mapRagTerminal({
				terminalReason: "structured_selection_ambiguous",
				evidence: null,
			}),
		).toEqual({
			kind: "clarify",
			reasonCode: "structured_selection_ambiguous",
		});
		expect(
			mapRagTerminal({
				terminalReason: "retrieval_policy_clarify",
				evidence: null,
			}),
		).toEqual({ kind: "clarify", reasonCode: "retrieval_policy_clarify" });
		expect(
			mapRagTerminal({
				terminalReason: "kg_jev_denied",
				evidence: null,
			}),
		).toEqual({ kind: "denied", reasonCode: "kg_jev_denied" });
		expect(clarificationQuestionFor("structured_parameters_missing")).toBe(
			"clarify_period",
		);
	});
});

describe("FactualRagRouteHandler", () => {
	function catalogRepo(
		kind: "structured" | "knowledge_graph",
	): BaseRagCatalogRepository {
		return {
			kind,
			load: async () => ({
				status: "ready",
				catalog: {
					kind,
					version: "v1",
					entries: [
						{
							id: kind === "structured" ? "customer_products" : "kg.op",
							version: "v1",
							allowedRoles: ["customer"],
							parameters: [],
						},
					],
				},
			}),
		};
	}

	test("maps ambiguous JEV to pending_clarification on both branches", async () => {
		const workflows = new WorkflowService(
			new InMemoryWorkflowStore(),
			new InMemoryApprovalStore(),
			{ next: () => "id-clarify" },
			{ now: () => new Date("2026-10-05T00:00:00.000Z") },
			300,
			new InMemoryClarificationStore(),
		);
		const ambiguous: StructuredQuerySelector = {
			select: async () => ({ decision: "ambiguous" }),
		};
		const deps = {
			primaryJev: { assess: async () => "database" as const },
			structuredCatalog: catalogRepo("structured"),
			knowledgeGraphCatalog: catalogRepo("knowledge_graph"),
			structuredJev: ambiguous,
			knowledgeGraphJev: ambiguous,
			retrievalPolicy: allowRetrievalPolicy,
			structuredRag: {
				executeSelection: async () => ({ status: "ready" as const, evidence }),
			},
			knowledgeGraphRag: {
				executeSelection: async () => ({ status: "ready" as const, evidence }),
			},
		};
		const database = new FactualRagRouteHandler("database", deps, workflows);
		const rag = new FactualRagRouteHandler("rag", deps, workflows);
		const context = {
			request: {
				sessionId: session.sessionId,
				message: "help",
				traceId: "trace-clarify",
				threadId: "thread-a",
				allowedSources: [],
				budget: defaultAgentBudget,
			},
			session,
			prompt: { content: "help", replacements: [] },
			state,
			signal: null,
			modelDecision: { kind: "respond" as const, response: "x" },
			route: {
				route: "database" as const,
				call: {
					toolId: "escalation.request",
					version: "1",
					arguments: { caseId: "C1" },
					idempotencyKey: "k",
				},
			},
			policy: {
				outcome: "ALLOW",
				decisionId: "d1",
				policyId: "p",
				policyVersion: "1",
				riskLevel: "low",
				reasons: [],
			} satisfies PolicyDecision,
		};
		const budget = new BudgetTracker(defaultAgentBudget);
		const structuredResult = await database.execute(
			{ ...context, route: { route: "database", call: context.route.call } },
			budget,
		);
		const kgResult = await rag.execute(
			{
				...context,
				route: { route: "rag", query: "relations help" },
				modelDecision: { kind: "route", route: "rag", query: "relations help" },
			},
			new BudgetTracker(defaultAgentBudget),
		);
		expect(structuredResult.status).toBe("pending_clarification");
		expect(kgResult.status).toBe("pending_clarification");
	});
});

describe("control plane casuistics via ConversationRunner", () => {
	function signalFor(
		mode: "safe" | "clarify" | "hitl",
	): DecisionSignalProvider {
		return {
			assess: async () => {
				if (mode === "clarify") {
					return {
						provider: "test-jev",
						domain: "ambiguous",
						routeHint: "clarify",
						domainConfidence: 0.4,
						routeConfidence: 0.4,
						allowedRoutes: ["clarify"],
						riskLevel: "low",
						evidenceSufficient: false,
						requiresEscalation: false,
						modelVersion: "v1",
					};
				}
				return {
					provider: "test-jev",
					domain: "in_domain",
					routeHint: mode === "hitl" ? "database" : "llm",
					domainConfidence: 0.99,
					routeConfidence: 0.99,
					allowedRoutes: ["llm", "database", "rag", "reject"],
					riskLevel: mode === "hitl" ? "high" : "low",
					evidenceSufficient: true,
					requiresEscalation: mode === "hitl",
					modelVersion: "v1",
				};
			},
		};
	}

	function modelFor(mode: "safe" | "clarify" | "hitl"): ModelProvider {
		return {
			decide: async () => ({
				value:
					mode === "hitl"
						? {
								kind: "tool",
								call: {
									toolId: "escalation.request",
									version: "1",
									arguments: { caseId: "C1" },
									idempotencyKey: "hitl-key",
								},
							}
						: { kind: "respond", response: "consulta segura autorizada" },
				usage: { inputTokens: 1, outputTokens: 1 },
			}),
			composeResponse: async () => ({
				value: "consulta segura autorizada",
				usage: { inputTokens: 1, outputTokens: 1 },
			}),
		};
	}

	function policyFor(mode: "safe" | "clarify" | "hitl"): PolicyEngine {
		return {
			evaluate: async () => ({
				outcome: mode === "hitl" ? "REQUIRE_APPROVAL" : "ALLOW",
				decisionId: `decision-${mode}`,
				policyId: "test-policy",
				policyVersion: "1",
				riskLevel: mode === "hitl" ? "high" : "low",
				reasons: mode === "hitl" ? ["escalation.request"] : ["allow"],
			}),
		};
	}

	test("safe query completes through ConversationRunner", async () => {
		const { runner } = createControlPlaneConversationRuntime({
			sessions,
			signal: signalFor("safe"),
			model: modelFor("safe"),
			guardrail: allowGuardrail,
			policy: policyFor("safe"),
			ragRuntime: null,
			now: () => new Date("2026-10-05T00:00:00.000Z"),
		});
		const result = await runner({
			session,
			threadId: "thread-safe",
			traceId: "trace-safe",
			message: "¿cuál es el estado de mi disputa?",
			onDelta: async () => {},
		});
		expect(result.status).toBe("completed");
		expect(result.response).toContain("segura");
	});

	test("repregunta maps pending_clarification to awaiting_clarification", async () => {
		const { runner } = createControlPlaneConversationRuntime({
			sessions,
			signal: signalFor("clarify"),
			model: modelFor("clarify"),
			guardrail: allowGuardrail,
			policy: policyFor("clarify"),
			ragRuntime: null,
			now: () => new Date("2026-10-05T00:00:00.000Z"),
		});
		const result = await runner({
			session,
			threadId: "thread-clarify",
			traceId: "trace-clarify",
			message: "ayuda",
			onDelta: async () => {},
		});
		expect(result.status).toBe("awaiting_clarification");
		expect(result.clarificationId).toBeTruthy();
		expect(result.workflowId).toBeTruthy();
		expect(result.response.length).toBeGreaterThan(0);
	});

	test("escalamiento yields pending_approval with DisputePolicyEngine", async () => {
		const { runner } = createControlPlaneConversationRuntime({
			sessions,
			signal: signalFor("hitl"),
			model: modelFor("hitl"),
			guardrail: allowGuardrail,
			policy: new DisputePolicyEngine(),
			ragRuntime: null,
			now: () => new Date("2026-10-05T00:00:00.000Z"),
		});
		const result = await runner({
			session,
			threadId: "thread-hitl",
			traceId: "trace-hitl",
			message: "escalar a un humano",
			onDelta: async () => {},
		});
		expect(result.status).toBe("pending_approval");
		expect(result.approvalId).toBeTruthy();
		expect(result.workflowId).toBeTruthy();
	});

	test("ConversationService emits clarification and HITL events", async () => {
		const store = new InMemoryConversationStore();
		const events = new InMemoryConversationEventPublisher();
		const received: string[] = [];
		const unsubscribe = events.subscribe(session.tenantId, (value) =>
			received.push(value.type),
		);

		const clarifyRunner = createControlPlaneConversationRunner({
			run: async () => ({
				status: "pending_clarification",
				decisionId: "d-clarify",
				workflowId: "w-clarify",
				clarificationId: "c-clarify",
				question: "¿Puedes precisar qué necesitas sobre soporte bancario?",
			}),
		} as unknown as AgentControlService);

		const clarifyService = new ConversationService(
			store,
			new InMemoryAttachmentStore(),
			events,
			clarifyRunner,
		);
		const clarifyQueued = await clarifyService.send({
			session,
			clientMessageId: "msg-clarify",
			text: "ayuda",
			attachmentIds: [],
			traceId: "trace-conv-clarify",
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		const clarifySnap = await clarifyService.get(
			session,
			clarifyQueued.threadId,
		);
		expect(clarifySnap?.trace.status).toBe("awaiting_clarification");
		expect(received).toContain("assistant.completed");
		expect(received).toContain("run.state");

		received.length = 0;
		const hitlRunner = createControlPlaneConversationRunner({
			run: async () => ({
				status: "pending_approval",
				decisionId: "d-hitl",
				workflowId: "w-hitl",
				approvalId: "a-hitl",
			}),
		} as unknown as AgentControlService);
		const hitlService = new ConversationService(
			new InMemoryConversationStore(),
			new InMemoryAttachmentStore(),
			events,
			hitlRunner,
		);
		const hitlQueued = await hitlService.send({
			session,
			clientMessageId: "msg-hitl",
			text: "escalar",
			attachmentIds: [],
			traceId: "trace-conv-hitl",
		});
		await new Promise((resolve) => setTimeout(resolve, 0));
		const hitlSnap = await hitlService.get(session, hitlQueued.threadId);
		expect(hitlSnap?.trace.status).toBe("pending_approval");
		expect(received).toContain("hitl.created");
		expect(received).toContain("backoffice.alert");
		unsubscribe();
	});
});
