import { describe, expect, test } from "bun:test";
import type { SessionContext } from "../src/domain/session.js";
import { createRagStateGraph } from "../src/services/control-plane/rag-state-graph.js";
import type { BaseRag } from "../src/services/retrieval/base-rag.js";
import type {
	BaseRagCatalogRepository,
	RagCatalogLoadResult,
} from "../src/services/retrieval/rag-catalog.js";

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
		catalog: { kind, version: "v1", entries: [] },
	};
}

function repository(
	kind: "structured" | "knowledge_graph",
	result: RagCatalogLoadResult,
): BaseRagCatalogRepository {
	return { kind, load: async () => result };
}

function rag(kind: "structured" | "knowledge_graph"): BaseRag {
	return {
		kind,
		execute: async () => ({ status: "ready", evidence: [] }),
	};
}

describe("RAG StateGraph", () => {
	test("loads the KG catalog before its specialized Jev gate", async () => {
		const graph = createRagStateGraph({
			primaryJev: { assess: async () => "relations" },
			structuredCatalog: repository("structured", catalog("structured")),
			knowledgeGraphCatalog: repository(
				"knowledge_graph",
				catalog("knowledge_graph"),
			),
			structuredJev: { assess: async () => true },
			knowledgeGraphJev: { assess: async () => true },
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
			knowledgeGraphJev: { assess: async () => true },
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
