import { afterEach, describe, expect, test } from "bun:test";
import { openChat } from "../scripts/chat-try.js";
import { envSchema } from "../src/config/env.js";
import type { ConversationHttpRuntime } from "../src/http/routes.js";
import { buildServer } from "../src/http/server.js";
import { createControlPlaneConversationRuntime } from "../src/integrations/evaluation/create-control-plane-conversation-runtime.js";
import { InMemoryDemoActorDirectory } from "../src/integrations/memory/demo-actor-directory.js";
import { InMemoryAttachmentStore } from "../src/integrations/memory/in-memory-attachment-store.js";
import {
	InMemoryConversationEventPublisher,
	InMemoryConversationStore,
} from "../src/integrations/memory/in-memory-conversation-store.js";
import { InMemorySessionStore } from "../src/integrations/memory/in-memory-session-store.js";
import { HeuristicHitlDecisionSignalProvider } from "../src/integrations/providers/heuristic-hitl-decision-signal-provider.js";
import { SafeInformationalModelProvider } from "../src/integrations/providers/safe-informational-model-provider.js";
import { capabilityRetrievalPolicy } from "../src/services/control-plane/capability-retrieval-policy.js";
import type { RagRetrievalRuntime } from "../src/services/control-plane/rag-retrieval-runtime.js";
import { createRagStateGraph } from "../src/services/control-plane/rag-state-graph.js";
import { pendingApprovalNotice } from "../src/services/conversations/control-plane-conversation-runner.js";
import { ConversationService } from "../src/services/conversations/conversation-service.js";
import type {
	DecisionSignalProvider,
	GuardrailProvider,
} from "../src/services/ports/control.js";
import type { BaseRagCatalogRepository } from "../src/services/retrieval/rag-catalog.js";

const origin = "http://localhost:3001";
const runtimeEnv = envSchema.parse({
	APP_ENV: "dev",
	DEMO_AUTH_ENABLED: true,
	REALTIME_ENABLED: true,
	CORS_ALLOWED_ORIGINS: origin,
});

const allowGuardrail: GuardrailProvider = {
	inspect: async ({ traceId }) => ({
		provider: "test",
		status: "NO_MATCH_FOUND",
		action: "allow",
		templateVersion: "1",
		traceId,
	}),
};

const evidence = [
	{
		content: JSON.stringify({
			query: "customer_movements:v1",
			filters: {},
			columns: ["concepto", "estado"],
			rows: [{ concepto: "compra de prueba", estado: "posted" }],
		}),
		documentRef: "customer_movements:v1",
		sourceType: "bigquery_structured",
		classification: "internal" as const,
		contentHash: "hash-a",
	},
];

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
						id: kind === "structured" ? "customer_movements" : "kg.op",
						version: "v1",
						allowedRoles: ["customer"],
						parameters: [],
					},
				],
			},
		}),
	};
}

/** Graph with fake selectors/executors; counts how often each branch runs. */
function ragRuntime(calls: { structured: number; knowledgeGraph: number }) {
	const dependencies = {
		primaryJev: { assess: async () => "database" as const },
		structuredCatalog: catalogRepo("structured"),
		knowledgeGraphCatalog: catalogRepo("knowledge_graph"),
		structuredJev: {
			select: async () => ({
				decision: "select" as const,
				queryId: "customer_movements",
				version: "v1",
				parameters: {},
			}),
		},
		knowledgeGraphJev: {
			select: async () => ({
				decision: "select" as const,
				operationId: "kg.op",
				version: "v1",
				parameters: {},
			}),
		},
		retrievalPolicy: capabilityRetrievalPolicy,
		structuredRag: {
			executeSelection: async () => {
				calls.structured += 1;
				return { status: "ready" as const, evidence };
			},
		},
		knowledgeGraphRag: {
			executeSelection: async () => {
				calls.knowledgeGraph += 1;
				return { status: "ready" as const, evidence };
			},
		},
	};
	return {
		graph: createRagStateGraph(dependencies),
		dependencies,
	} as unknown as RagRetrievalRuntime;
}

const kgSignal: DecisionSignalProvider = {
	assess: async () => ({
		provider: "test-jev",
		domain: "in_domain",
		routeHint: "rag",
		domainConfidence: 0.99,
		routeConfidence: 0.99,
		allowedRoutes: ["llm", "database", "rag", "clarify"],
		riskLevel: "low",
		evidenceSufficient: true,
		requiresEscalation: false,
		modelVersion: "test-1",
	}),
};

type Harness = {
	app: Awaited<ReturnType<typeof buildServer>>;
	baseUrl: string;
	calls: { structured: number; knowledgeGraph: number };
};
const open: Harness[] = [];

/** Real server and WebSocket; the control_plane runner is injected, so no demo auth rule is bent. */
async function start(
	options: { signal?: DecisionSignalProvider } = {},
): Promise<Harness> {
	const calls = { structured: 0, knowledgeGraph: 0 };
	const sessions = new InMemorySessionStore();
	const publisher = new InMemoryConversationEventPublisher();
	const attachments = new InMemoryAttachmentStore();
	const { runner } = createControlPlaneConversationRuntime({
		sessions,
		signal: options.signal ?? new HeuristicHitlDecisionSignalProvider(),
		model: new SafeInformationalModelProvider(),
		guardrail: allowGuardrail,
		ragRuntime: ragRuntime(calls),
		routeFromSignal: true,
	});
	const conversationRuntime: ConversationHttpRuntime = {
		sessions,
		publisher,
		attachments,
		demoActors: new InMemoryDemoActorDirectory(),
		demoFixtures: { transactionId: "tx", disputeId: "dp", caseId: "cs" },
		conversations: new ConversationService(
			new InMemoryConversationStore(),
			attachments,
			publisher,
			runner,
		),
	};
	const app = await buildServer({ env: runtimeEnv, conversationRuntime });
	const baseUrl = await app.listen({ host: "127.0.0.1", port: 0 });
	const harness: Harness = { app, baseUrl, calls };
	open.push(harness);
	return harness;
}

async function ask(harness: Harness, message: string) {
	const chat = await openChat({
		baseUrl: harness.baseUrl,
		actorId: "demo-customer-1",
		origin,
		timeoutMs: 10_000,
	});
	const turn = await chat.send(message);
	await chat.close();
	return turn;
}

afterEach(async () => {
	for (const harness of open.splice(0)) await harness.app.close();
});

describe("control_plane through the real server and WebSocket", () => {
	test("a ledger read crosses the Structured branch of the graph", async () => {
		const harness = await start();
		const turn = await ask(harness, "cuales son mis ultimos movimientos");
		expect(turn.problem).toBeNull();
		expect(turn.status).toBe("completed");
		expect(harness.calls.structured).toBe(1);
		expect(harness.calls.knowledgeGraph).toBe(0);
		expect(turn.reply).toContain("customer_movements:v1: 1 resultado");
		expect(turn.reply).toContain("concepto: compra de prueba");
		expect(turn.reply).not.toContain("{");
	});

	test("a rag hint crosses the knowledge-graph branch", async () => {
		const harness = await start({ signal: kgSignal });
		const turn = await ask(harness, "como se relacionan mis comercios");
		expect(turn.status).toBe("completed");
		expect(harness.calls.knowledgeGraph).toBe(1);
		expect(harness.calls.structured).toBe(0);
	});

	test("asking for a human pauses for approval and reads nothing", async () => {
		const harness = await start();
		const turn = await ask(harness, "quiero hablar con un humano");
		expect(turn.status).toBe("pending_approval");
		expect(turn.reply).toBe(pendingApprovalNotice);
		expect(harness.calls.structured).toBe(0);
		expect(harness.calls.knowledgeGraph).toBe(0);
	});

	test("an ambiguous message asks for clarification and reads nothing", async () => {
		const harness = await start();
		const turn = await ask(harness, "ayuda");
		expect(turn.status).toBe("awaiting_clarification");
		expect(harness.calls.structured).toBe(0);
	});

	test("an out-of-domain message is refused and reads nothing", async () => {
		const harness = await start();
		const turn = await ask(harness, "como esta el clima hoy");
		expect(turn.status).toBe("completed");
		expect(harness.calls.structured).toBe(0);
		expect(harness.calls.knowledgeGraph).toBe(0);
	});
});
