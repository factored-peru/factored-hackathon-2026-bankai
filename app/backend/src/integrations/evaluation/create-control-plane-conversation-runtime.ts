/**
 * Composition root: AgentControlService + ConversationRunner for
 * CHAT_PIPELINE=control_plane. ADR 0004: requiresEscalation synthesizes
 * escalation.request; DisputePolicyEngine remains the authorization source.
 */
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { DecisionState } from "../../domain/control/contracts.js";
import type { SessionStore } from "../../domain/session.js";
import type { ToolDefinition } from "../../domain/tools/contracts.js";
import { AgentControlService } from "../../services/control-plane/agent-control-service.js";
import { AgentDecisionStage } from "../../services/control-plane/decision-stage.js";
import { AgentInputStage } from "../../services/control-plane/input-stage.js";
import { AgentPolicyStage } from "../../services/control-plane/policy-stage.js";
import type { RagRetrievalRuntime } from "../../services/control-plane/rag-retrieval-runtime.js";
import { AgentResponseStage } from "../../services/control-plane/response-stage.js";
import { AgentRouteStage } from "../../services/control-plane/route-stage.js";
import { DatabaseRouteHandler } from "../../services/control-plane/routes/database-route-handler.js";
import { FactualRagRouteHandler } from "../../services/control-plane/routes/factual-rag-route-handler.js";
import { LlmRouteHandler } from "../../services/control-plane/routes/llm-route-handler.js";
import { RagRouteHandler } from "../../services/control-plane/routes/rag-route-handler.js";
import { RejectRouteHandler } from "../../services/control-plane/routes/reject-route-handler.js";
import { createControlPlaneConversationRunner } from "../../services/conversations/control-plane-conversation-runner.js";
import type { PendingClarificationStore } from "../../services/conversations/pending-clarification.js";
import { DisclosureService } from "../../services/disclosure/disclosure-service.js";
import { FinalResponseGuardrail } from "../../services/disclosure/final-response-guardrail.js";
import { DisputePolicyEngine } from "../../services/disputes/dispute-policy-engine.js";
import type {
	DecisionSignalProvider,
	GuardrailProvider,
	ModelProvider,
	PolicyEngine,
} from "../../services/ports/control.js";
import type { ConversationRunner } from "../../services/ports/conversation.js";
import type { AuditSink } from "../../services/ports/observability.js";
import type { IdempotencyStore } from "../../services/ports/tools.js";
import { GenerationPrivacyService } from "../../services/privacy/generation-privacy-service.js";
import { PromptPrivacyService } from "../../services/privacy/prompt-privacy-service.js";
import { RetrievalService } from "../../services/retrieval/retrieval-service.js";
import { ToolExecutionService } from "../../services/tools/tool-execution-service.js";
import { WorkflowService } from "../../services/workflows/workflow-service.js";
import {
	InMemoryApprovalStore,
	InMemoryAuditSink,
	InMemoryClarificationStore,
	InMemoryIdempotencyStore,
	InMemoryWorkflowStore,
} from "../memory/in-memory-control-stores.js";
import { RegexContentPrivacyProvider } from "../providers/regex-content-privacy-provider.js";
import { StaticToolRegistry } from "../tools/static-tool-registry.js";

const defaultToolDefinition: ToolDefinition = {
	id: "escalation.request",
	version: "1",
	capability: "dispute.escalation.request",
	sideEffect: "none",
	risk: "medium",
	idempotency: "required",
	timeoutMs: 100,
	approval: "policy",
	inputSchema: z.object({ caseId: z.string() }).strict(),
	outputSchema: z.object({ status: z.string() }).strict(),
};

const defaultDecisionState: DecisionState = {
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

export type ControlPlaneRunnerDeps = Readonly<{
	sessions: SessionStore;
	signal: DecisionSignalProvider;
	model: ModelProvider;
	guardrail: GuardrailProvider;
	ragRuntime?: RagRetrievalRuntime | null;
	policy?: PolicyEngine;
	audit?: AuditSink;
	idempotency?: IdempotencyStore;
	now?: () => Date;
	/**
	 * Route confident `database` / `rag` hints of the primary signal straight to
	 * the factual graph instead of asking the model (ADR 0004). Off by default.
	 */
	routeFromSignal?: boolean;
	/** Where a thread keeps the query it waits to finish; per process when unset. */
	pendingClarifications?: PendingClarificationStore;
}>;

export function createControlPlaneConversationRuntime(
	deps: ControlPlaneRunnerDeps,
): { service: AgentControlService; runner: ConversationRunner } {
	const privacyProvider = new RegexContentPrivacyProvider();
	const promptPrivacy = new PromptPrivacyService(privacyProvider);
	const generationPrivacy = new GenerationPrivacyService(privacyProvider);
	const workflows = new WorkflowService(
		new InMemoryWorkflowStore(),
		new InMemoryApprovalStore(),
		{ next: () => `cp-${randomUUID()}` },
		{ now: deps.now ?? (() => new Date()) },
		300,
		new InMemoryClarificationStore(),
	);
	const policy = deps.policy ?? new DisputePolicyEngine();
	const tools = new ToolExecutionService(
		new StaticToolRegistry([defaultToolDefinition]),
		{
			resolve: async ({ arguments: value }) => value,
		},
		{
			execute: async () => ({ status: "mock_escalation" }),
		},
		deps.idempotency ?? new InMemoryIdempotencyStore(),
	);
	const retrieval = new RetrievalService(
		{
			search: async () => [],
		},
		deps.guardrail,
	);
	const disclosure = new DisclosureService({
		apply: async ({ value }) => ({
			action: "allow",
			value,
			reasonCode: "allowed",
		}),
	});

	// HITL pauses in policy before route execute; FactualRag only runs on ALLOW.
	const routeHandlers =
		deps.ragRuntime === null || deps.ragRuntime === undefined
			? [
					new LlmRouteHandler(),
					new DatabaseRouteHandler(tools),
					new RagRouteHandler(retrieval, promptPrivacy),
					new RejectRouteHandler(),
				]
			: [
					new LlmRouteHandler(),
					new FactualRagRouteHandler(
						"database",
						deps.ragRuntime.dependencies,
						workflows,
					),
					new FactualRagRouteHandler(
						"rag",
						deps.ragRuntime.dependencies,
						workflows,
					),
					new RejectRouteHandler(),
				];

	const service = new AgentControlService(
		new AgentInputStage(
			deps.sessions,
			deps.guardrail,
			promptPrivacy,
			{ project: async () => defaultDecisionState },
			deps.now ?? (() => new Date()),
		),
		new AgentDecisionStage(
			deps.signal,
			deps.model,
			deps.guardrail,
			deps.routeFromSignal === true ? { routeFromSignal: true } : {},
		),
		new AgentPolicyStage(policy, workflows),
		new AgentRouteStage(routeHandlers),
		new AgentResponseStage(
			deps.model,
			disclosure,
			generationPrivacy,
			new FinalResponseGuardrail(deps.guardrail),
		),
		deps.audit ?? new InMemoryAuditSink(),
		deps.now ?? (() => new Date()),
	);

	return {
		service,
		runner: createControlPlaneConversationRunner(
			service,
			deps.pendingClarifications,
		),
	};
}
