import { describe, expect, test } from "bun:test";
import type { SessionContext } from "../src/domain/session.js";
import { createInMemoryCheckpointer } from "../src/integrations/memory/in-memory-checkpointer.js";
import {
	type ConversationTurn,
	createRagStateGraph,
	MAX_CONVERSATION_TURNS,
	type PrimaryJevRoute,
	ragThreadConfig,
} from "../src/services/control-plane/rag-state-graph.js";
import type { BaseRag } from "../src/services/retrieval/base-rag.js";
import type { KnowledgeGraphRagExecutor } from "../src/services/retrieval/knowledge-graph-rag.js";
import type { KnowledgeGraphSelection } from "../src/services/retrieval/knowledge-graph-selection.js";
import type {
	BaseRagCatalogRepository,
	RagCatalogLoadResult,
} from "../src/services/retrieval/rag-catalog.js";
import { knowledgeGraphQuestionGoldens } from "./fixtures/kg-question-goldens.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

function catalog(kind: "structured" | "knowledge_graph"): RagCatalogLoadResult {
	return {
		status: "ready",
		catalog: {
			kind,
			version: "v1",
			entries:
				kind === "knowledge_graph"
					? [
							{
								id: "kg.population.summary",
								version: "v1",
								allowedRoles: ["customer"],
								parameters: [
									{
										name: "population",
										type: "string",
										allowedValues: ["transactions"],
									},
								],
							},
						]
					: [],
		},
	};
}

function repository(
	kind: "structured" | "knowledge_graph",
	result: RagCatalogLoadResult,
): BaseRagCatalogRepository {
	return { kind, load: async () => result };
}

function rag(
	kind: "structured" | "knowledge_graph",
): BaseRag & KnowledgeGraphRagExecutor {
	return {
		kind,
		execute: async () => ({ status: "ready", evidence: [] }),
		executeSelection: async () => ({ status: "ready", evidence: [] }),
	};
}

function caseQuestionCatalog(): RagCatalogLoadResult {
	return {
		status: "ready",
		catalog: {
			kind: "knowledge_graph",
			version: "v1",
			entries: [
				{
					id: "kg.case.summary",
					version: "v1",
					allowedRoles: ["customer"],
					parameters: [
						{
							name: "case_id",
							type: "string",
							allowedValues: ["C1", "C2", "C3", "C4", "C5"],
						},
					],
				},
			],
		},
	};
}

describe("RAG StateGraph", () => {
	test("routes every C1-C5 synthetic question through the closed KG case summary", async () => {
		for (const golden of knowledgeGraphQuestionGoldens) {
			const queries: string[] = [];
			const selections: KnowledgeGraphSelection[] = [];
			const graph = createRagStateGraph({
				primaryJev: { assess: async () => "relations" },
				structuredCatalog: repository("structured", catalog("structured")),
				knowledgeGraphCatalog: repository(
					"knowledge_graph",
					caseQuestionCatalog(),
				),
				structuredJev: { assess: async () => true },
				knowledgeGraphJev: {
					select: async ({ query }) => {
						queries.push(query);
						return golden.expectedSelection;
					},
				},
				structuredRag: rag("structured"),
				knowledgeGraphRag: {
					executeSelection: async ({ selection }) => {
						selections.push(selection);
						return { status: "ready", evidence: [] };
					},
				},
			});

			const result = await graph.invoke({
				query: golden.question,
				session,
				traceId: `trace-${golden.fixtureId}`,
				route: "llm",
				catalog: null,
				terminalReason: null,
			});

			expect(queries).toEqual([golden.question]);
			expect(selections).toEqual([golden.expectedSelection]);
			expect(result.knowledgeGraphSelection).toEqual(golden.expectedSelection);
			expect(result.executionOrder).toEqual([
				"primary_jev",
				"kg_catalog",
				"kg_jev",
				"kg_rag",
			]);
			expect(result.terminalReason).toBeNull();
		}
	});

	test("loads the KG catalog before its specialized Jev gate", async () => {
		const graph = createRagStateGraph({
			primaryJev: { assess: async () => "relations" },
			structuredCatalog: repository("structured", catalog("structured")),
			knowledgeGraphCatalog: repository(
				"knowledge_graph",
				catalog("knowledge_graph"),
			),
			structuredJev: { assess: async () => true },
			knowledgeGraphJev: {
				select: async () => ({
					decision: "select",
					operationId: "kg.population.summary",
					version: "v1",
					parameters: { population: "transactions" },
				}),
			},
			structuredRag: rag("structured"),
			knowledgeGraphRag: rag("knowledge_graph"),
		});

		const result = await graph.invoke({
			query: "my card dispute",
			session,
			traceId: "trace-a",
			route: "llm",
			catalog: null,
			terminalReason: null,
		});

		expect(result.executionOrder).toEqual([
			"primary_jev",
			"kg_catalog",
			"kg_jev",
			"kg_rag",
		]);
	});

	test("fails closed before a specialized Jev when a catalog is unavailable", async () => {
		const graph = createRagStateGraph({
			primaryJev: { assess: async () => "database" },
			structuredCatalog: repository("structured", {
				status: "unavailable",
				reasonCode: "structured_catalog_unavailable",
			}),
			knowledgeGraphCatalog: repository(
				"knowledge_graph",
				catalog("knowledge_graph"),
			),
			structuredJev: { assess: async () => true },
			knowledgeGraphJev: { select: async () => ({ decision: "deny" }) },
			structuredRag: rag("structured"),
			knowledgeGraphRag: rag("knowledge_graph"),
		});

		const result = await graph.invoke({
			query: "my card dispute",
			session,
			traceId: "trace-a",
			route: "llm",
			catalog: null,
			terminalReason: null,
		});

		expect(result.executionOrder).toEqual([
			"primary_jev",
			"structured_catalog",
		]);
		expect(result.terminalReason).toBe("structured_catalog_unavailable");
	});
});

describe("RAG StateGraph thread memory", () => {
	function memoryGraph(
		seen: ConversationTurn[][],
		routes: PrimaryJevRoute[] = ["llm"],
	) {
		let call = 0;
		return createRagStateGraph({
			primaryJev: {
				assess: async ({ history }) => {
					seen.push([...history]);
					return routes[Math.min(call++, routes.length - 1)] ?? "llm";
				},
			},
			structuredCatalog: repository("structured", catalog("structured")),
			knowledgeGraphCatalog: repository(
				"knowledge_graph",
				catalog("knowledge_graph"),
			),
			structuredJev: { assess: async () => true },
			knowledgeGraphJev: { select: async () => ({ decision: "deny" }) },
			structuredRag: rag("structured"),
			knowledgeGraphRag: rag("knowledge_graph"),
			checkpointer: createInMemoryCheckpointer(),
		});
	}

	// Per-turn fields are deliberately omitted: `begin_turn` must reset them.
	const turn = (query: string) => ({ query, session, traceId: "trace-a" });

	test("gives the Jev the previous turns of the same thread", async () => {
		const seen: ConversationTurn[][] = [];
		const graph = memoryGraph(seen);
		const config = ragThreadConfig(session, "thread-a");

		await graph.invoke(turn("balance of my card"), config);
		await graph.invoke(turn("and last month?"), config);

		expect(seen[0]).toEqual([]);
		expect(seen[1]).toEqual([{ role: "user", content: "balance of my card" }]);
	});

	test("does not share history between threads or sessions", async () => {
		const seen: ConversationTurn[][] = [];
		const graph = memoryGraph(seen);

		await graph.invoke(turn("first"), ragThreadConfig(session, "thread-a"));
		await graph.invoke(turn("second"), ragThreadConfig(session, "thread-b"));
		await graph.invoke(
			turn("third"),
			ragThreadConfig({ ...session, sessionId: "session-b" }, "thread-a"),
		);

		expect(seen.map((history) => history.length)).toEqual([0, 0, 0]);
	});

	test("resets the trace and terminal reason on every turn", async () => {
		const seen: ConversationTurn[][] = [];
		const graph = createRagStateGraph({
			primaryJev: {
				assess: async ({ history }) => {
					seen.push([...history]);
					return history.length === 0 ? "database" : "llm";
				},
			},
			structuredCatalog: repository("structured", {
				status: "unavailable",
				reasonCode: "structured_catalog_unavailable",
			}),
			knowledgeGraphCatalog: repository(
				"knowledge_graph",
				catalog("knowledge_graph"),
			),
			structuredJev: { assess: async () => true },
			knowledgeGraphJev: { select: async () => ({ decision: "deny" }) },
			structuredRag: rag("structured"),
			knowledgeGraphRag: rag("knowledge_graph"),
			checkpointer: createInMemoryCheckpointer(),
		});
		const config = ragThreadConfig(session, "thread-a");

		const first = await graph.invoke(turn("card balance"), config);
		const second = await graph.invoke(turn("thanks"), config);

		expect(first.terminalReason).toBe("structured_catalog_unavailable");
		expect(second.terminalReason).toBeNull();
		expect(second.executionOrder).toEqual(["primary_jev"]);
	});

	test("keeps at most MAX_CONVERSATION_TURNS turns", async () => {
		const seen: ConversationTurn[][] = [];
		const graph = memoryGraph(seen);
		const config = ragThreadConfig(session, "thread-a");

		for (let index = 0; index < MAX_CONVERSATION_TURNS + 5; index++) {
			await graph.invoke(turn(`message ${index}`), config);
		}

		const last = seen.at(-1) ?? [];
		expect(last.length).toBe(MAX_CONVERSATION_TURNS - 1);
		expect(last.at(-1)?.content).toBe(`message ${MAX_CONVERSATION_TURNS + 3}`);
	});
});
