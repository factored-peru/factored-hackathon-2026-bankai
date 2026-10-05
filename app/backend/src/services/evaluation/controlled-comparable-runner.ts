import { randomUUID } from "node:crypto";
import { z } from "zod";
import {
	type DecisionState,
	defaultAgentBudget,
	type PolicyDecision,
} from "../../domain/control/contracts.js";
import type {
	CreateSessionInput,
	SessionContext,
	SessionStore,
} from "../../domain/session.js";
import type { ToolDefinition } from "../../domain/tools/contracts.js";
import {
	InMemoryApprovalStore,
	InMemoryAuditSink,
	InMemoryIdempotencyStore,
	InMemoryWorkflowStore,
} from "../../integrations/memory/in-memory-control-stores.js";
import { RegexContentPrivacyProvider } from "../../integrations/providers/regex-content-privacy-provider.js";
import { StaticToolRegistry } from "../../integrations/tools/static-tool-registry.js";
import { AgentControlService } from "../control-plane/agent-control-service.js";
import { AgentDecisionStage } from "../control-plane/decision-stage.js";
import { AgentInputStage } from "../control-plane/input-stage.js";
import { AgentPolicyStage } from "../control-plane/policy-stage.js";
import { AgentResponseStage } from "../control-plane/response-stage.js";
import { AgentRouteStage } from "../control-plane/route-stage.js";
import { DatabaseRouteHandler } from "../control-plane/routes/database-route-handler.js";
import { LlmRouteHandler } from "../control-plane/routes/llm-route-handler.js";
import { RagRouteHandler } from "../control-plane/routes/rag-route-handler.js";
import { RejectRouteHandler } from "../control-plane/routes/reject-route-handler.js";
import { DisclosureService } from "../disclosure/disclosure-service.js";
import { FinalResponseGuardrail } from "../disclosure/final-response-guardrail.js";
import type {
	DecisionSignalProvider,
	GuardrailProvider,
	ModelProvider,
	PolicyEngine,
} from "../ports/control.js";
import { GenerationPrivacyService } from "../privacy/generation-privacy-service.js";
import { PromptPrivacyService } from "../privacy/prompt-privacy-service.js";
import { RetrievalService } from "../retrieval/retrieval-service.js";
import { ToolExecutionService } from "../tools/tool-execution-service.js";
import { WorkflowService } from "../workflows/workflow-service.js";
import {
	type ComparablePipelineRunner,
	type EvaluationScenario,
	type PipelineRunRecord,
	parsePipelineRunRecord,
} from "./ab-contracts.js";

function sessionFor(actorId: string): SessionContext {
	return {
		sessionId: "ab-controlled-session",
		userId: actorId,
		tenantId: "demo-bankai",
		scopes: ["dispute:read"],
		roles: ["customer"],
		capabilities: ["movements:read", "dispute.read"],
		sessionVersion: 1,
		createdAt: "2026-10-05T00:00:00.000Z",
		lastSeenAt: "2026-10-05T00:00:00.000Z",
		expiresAt: "2026-10-05T01:00:00.000Z",
		revokedAt: null,
	};
}

type ScenarioMode =
	| "database_ok"
	| "rag_ok"
	| "llm_ok"
	| "ood"
	| "deny"
	| "hitl"
	| "guardrail_block";

function modeFor(scenario: EvaluationScenario): ScenarioMode {
	if (scenario.scenarioId.includes("injection")) return "guardrail_block";
	if (scenario.expectedRoute === "ood") return "ood";
	if (scenario.expectedRoute === "deny") return "deny";
	if (scenario.expectedRoute === "hitl") return "hitl";
	if (scenario.expectedRoute === "structured_rag") return "database_ok";
	if (scenario.expectedRoute === "kg_rag") return "rag_ok";
	return "llm_ok";
}

/**
 * Conversation-shaped adapter over AgentControlService for offline A/B.
 * Uses the same stage composition as unit harnesses; no HTTP / AGENTIC flags.
 */
export class ControlledComparableRunner implements ComparablePipelineRunner {
	readonly pipeline = "controlled" as const;

	async run(scenario: EvaluationScenario): Promise<PipelineRunRecord> {
		const started = performance.now();
		const mode = modeFor(scenario);
		const { service, counters } = createControlledHarness(scenario, mode);
		const session = sessionFor(scenario.actorId);
		const result = await service.run({
			sessionId: session.sessionId,
			message: scenario.prompt,
			traceId: `ab-controlled-${scenario.scenarioId}`,
			threadId: `ab-${scenario.scenarioId}`,
			allowedSources: ["source-a"],
			budget: defaultAgentBudget,
		});

		const status = result.status;
		const errorCode =
			"reasonCode" in result && typeof result.reasonCode === "string"
				? result.reasonCode
				: null;

		let route: PipelineRunRecord["route"] = "unknown";
		if (mode === "database_ok") route = "structured_rag";
		else if (mode === "rag_ok") route = "kg_rag";
		else if (mode === "ood") route = "ood";
		else if (mode === "deny") route = "deny";
		else if (mode === "hitl") route = "hitl";
		else if (mode === "guardrail_block") route = "ood";
		else route = "llm";

		const retrievalAttemptCount = counters.retrievalAttempts;
		const retrievalSuccessCount = counters.retrievalSuccesses;

		return parsePipelineRunRecord({
			runId: `controlled-${scenario.scenarioId}-${randomUUID().slice(0, 8)}`,
			scenarioId: scenario.scenarioId,
			snapshotId: scenario.snapshotId,
			pipeline: "controlled",
			status,
			route,
			queryPlanId: scenario.expectedQueryPlanId,
			catalogVersion:
				scenario.expectedQueryPlanId || mode === "rag_ok" ? "v1" : null,
			policyVersion: "synthetic-v1",
			modelVersion: "controlled-ab-double",
			durationMs: Math.max(0, Math.round(performance.now() - started)),
			modelCallCount: counters.modelCalls,
			retrievalAttemptCount,
			retrievalSuccessCount,
			aggregatedRowCount: retrievalSuccessCount > 0 ? 1 : 0,
			aggregatedBytes: retrievalSuccessCount > 0 ? 64 : 0,
			toolOutcome:
				status === "denied"
					? "denied"
					: retrievalSuccessCount > 0
						? "ready"
						: mode === "guardrail_block"
							? "skipped"
							: "none",
			errorCode,
			gatesInvoked: {
				controlPlane: true,
				privacy: true,
				guardrail: true,
				policy: mode !== "guardrail_block" && mode !== "ood",
			},
		});
	}
}

function createControlledHarness(
	scenario: EvaluationScenario,
	mode: ScenarioMode,
) {
	const session = sessionFor(scenario.actorId);
	const sessions: SessionStore = {
		get: async (sessionId) =>
			sessionId === session.sessionId ? session : null,
		create: async (_input: CreateSessionInput) => session,
		rotate: async () => session,
		revoke: async () => undefined,
	};

	const toolId = "get_movements";
	const toolDefinition: ToolDefinition = {
		id: toolId,
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

	const state: DecisionState = {
		intent: scenario.expectedQueryPlanId ?? scenario.expectedRoute,
		actorRole: "customer",
		tenantScope: "self",
		requestedTool: mode === "database_ok" ? toolId : null,
		riskLevel: mode === "hitl" ? "high" : "low",
		policyFlags: [],
		accountVerified: true,
		amountBucket: null,
		evidenceQuality: mode === "rag_ok" ? "medium" : "none",
		opaqueHandles: ["ref-a"],
		provenance: [],
	};

	const counters = {
		modelCalls: 0,
		retrievalAttempts: 0,
		retrievalSuccesses: 0,
	};

	const guardrail: GuardrailProvider = {
		inspect: async ({ surface, traceId }) => {
			const block = mode === "guardrail_block" && surface === "user_input";
			return {
				provider: "ab-test",
				status: block ? "FAILURE" : "NO_MATCH_FOUND",
				action: block ? "block" : "allow",
				templateVersion: "1",
				traceId,
			};
		},
	};

	const toolCall = {
		kind: "tool" as const,
		call: {
			toolId,
			version: "1",
			arguments: { accountRef: "ref-a" },
			idempotencyKey: `ab-${scenario.scenarioId}`,
		},
	};

	const model: ModelProvider = {
		decide: async () => {
			counters.modelCalls += 1;
			if (mode === "ood") {
				return {
					value: {
						kind: "route",
						route: "out_of_domain" as const,
						responseKey: "ood_safe",
					},
					usage: { inputTokens: 4, outputTokens: 2 },
				};
			}
			if (mode === "rag_ok") {
				return {
					value: {
						kind: "route",
						route: "rag" as const,
						query: "synthetic-kg-case-scope",
					},
					usage: { inputTokens: 4, outputTokens: 2 },
				};
			}
			if (mode === "llm_ok") {
				return {
					value: { kind: "respond", response: "synthetic-controlled-llm" },
					usage: { inputTokens: 4, outputTokens: 2 },
				};
			}
			return {
				value: toolCall,
				usage: { inputTokens: 8, outputTokens: 4 },
			};
		},
		composeResponse: async () => {
			counters.modelCalls += 1;
			return {
				value: "synthetic-controlled-response",
				usage: { inputTokens: 2, outputTokens: 4 },
			};
		},
	};

	const signal: DecisionSignalProvider = {
		assess: async () => {
			if (mode === "ood") {
				return {
					provider: "jev-ab",
					domain: "out_of_domain",
					routeHint: "reject",
					domainConfidence: 0.99,
					routeConfidence: 0.99,
					allowedRoutes: ["reject"],
					riskLevel: "low",
					evidenceSufficient: true,
					requiresEscalation: false,
					modelVersion: "jev-ab-v1",
				};
			}
			const routeHint =
				mode === "rag_ok" ? "rag" : mode === "llm_ok" ? "llm" : "database";
			return {
				provider: "jev-ab",
				domain: "in_domain",
				routeHint,
				domainConfidence: 0.99,
				routeConfidence: 0.99,
				allowedRoutes: [routeHint, "llm", "rag", "database", "reject"],
				riskLevel: mode === "hitl" ? "high" : "low",
				evidenceSufficient: true,
				requiresEscalation: mode === "hitl",
				modelVersion: "jev-ab-v1",
			};
		},
	};

	const basePolicy: PolicyDecision = {
		outcome: "ALLOW",
		decisionId: "ab-policy",
		policyId: "ab-policy",
		policyVersion: "1",
		riskLevel: "low",
		reasons: [],
	};

	const policy: PolicyEngine = {
		evaluate: async () => {
			if (mode === "deny") {
				return { ...basePolicy, outcome: "DENY", decisionId: "ab-deny" };
			}
			if (mode === "hitl") {
				return {
					...basePolicy,
					outcome: "REQUIRE_APPROVAL",
					decisionId: "ab-hitl",
					riskLevel: "high",
				};
			}
			return basePolicy;
		},
	};

	const tools = new ToolExecutionService(
		new StaticToolRegistry([toolDefinition]),
		{
			resolve: async ({ arguments: value }) => value,
		},
		{
			execute: async () => {
				counters.retrievalAttempts += 1;
				counters.retrievalSuccesses += 1;
				return { count: 1 };
			},
		},
		new InMemoryIdempotencyStore(),
	);

	const workflows = new InMemoryWorkflowStore();
	let id = 0;
	const workflowService = new WorkflowService(
		workflows,
		new InMemoryApprovalStore(),
		{ next: () => `ab-id-${++id}` },
		{ now: () => new Date("2026-10-05T00:00:00.000Z") },
		300,
	);

	const privacyProvider = new RegexContentPrivacyProvider();
	const promptPrivacy = new PromptPrivacyService(privacyProvider);
	const generationPrivacy = new GenerationPrivacyService(privacyProvider);
	const retrieval = new RetrievalService(
		{
			search: async () => {
				counters.retrievalAttempts += 1;
				counters.retrievalSuccesses += 1;
				return [
					{
						content: "aggregate exploratory note",
						tenantId: "demo-bankai",
						documentId: "doc-ab",
						sourceId: "source-a",
						sourceType: "manual",
						documentVersion: "1",
						classification: "internal",
						createdAt: "2026-10-05T00:00:00.000Z",
						contentHash: "hash-ab",
					},
				];
			},
		},
		guardrail,
	);

	const disclosure = new DisclosureService({
		apply: async ({ value }) => ({
			action: "allow",
			value,
			reasonCode: "allowed",
		}),
	});

	const service = new AgentControlService(
		new AgentInputStage(
			sessions,
			guardrail,
			promptPrivacy,
			{ project: async () => state },
			() => new Date("2026-10-05T00:00:00.000Z"),
		),
		new AgentDecisionStage(signal, model, guardrail),
		new AgentPolicyStage(policy, workflowService),
		new AgentRouteStage([
			new LlmRouteHandler(),
			new RagRouteHandler(retrieval, promptPrivacy),
			new DatabaseRouteHandler(tools),
			new RejectRouteHandler(),
		]),
		new AgentResponseStage(
			model,
			disclosure,
			generationPrivacy,
			new FinalResponseGuardrail(guardrail),
		),
		new InMemoryAuditSink(),
		() => new Date("2026-10-05T00:00:00.000Z"),
	);

	return { service, counters };
}
