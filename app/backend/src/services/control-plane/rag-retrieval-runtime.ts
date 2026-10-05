/**
 * Composition root for the retrieval StateGraph with a published KG runtime.
 *
 * Wires catalog + KnowledgeGraphRag into createRagStateGraph. Structured RAG and
 * JEV selectors are injected by the caller so BigQuery/JEV stay opt-in.
 */
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import {
	type CatalogJevRouter,
	createRagStateGraph,
	type PrimaryJevRouter,
	type RagStateGraphDependencies,
} from "../control-plane/rag-state-graph.js";
import type { BaseRag } from "../retrieval/base-rag.js";
import type { ImmutableKnowledgeGraphArtifactRepository } from "../retrieval/knowledge-graph-artifacts.js";
import type { KnowledgeGraphRag } from "../retrieval/knowledge-graph-rag.js";
import type { KnowledgeGraphOperationSelector } from "../retrieval/knowledge-graph-selection.js";
import type { BaseRagCatalogRepository } from "../retrieval/rag-catalog.js";

export type RagRetrievalRuntime = Readonly<{
	graph: ReturnType<typeof createRagStateGraph>;
	dependencies: RagStateGraphDependencies;
}>;

/** Structural KG binding for the retrieval graph; adapters live in integrations. */
export type KnowledgeGraphRuntimeBinding = Readonly<{
	catalog: ImmutableKnowledgeGraphArtifactRepository;
	rag: KnowledgeGraphRag;
}>;

/** Fail-closed KG JEV used until a production selector is composed. */
export const denyKnowledgeGraphSelector: KnowledgeGraphOperationSelector = {
	select: async () => ({ decision: "deny" as const }),
};

/** Routes every query to the KG branch when Structured RAG is unavailable. */
export const relationsPrimaryJev: PrimaryJevRouter = {
	assess: async () => "relations",
};

export const allowCatalogJev: CatalogJevRouter = {
	assess: async () => true,
};

const unavailableStructuredCatalog: BaseRagCatalogRepository = {
	kind: "structured",
	load: async () => ({
		status: "unavailable",
		reasonCode: "structured_runtime_disabled",
	}),
};

const unavailableStructuredRag: BaseRag = {
	kind: "structured",
	execute: async () => ({
		status: "failed",
		reasonCode: "structured_runtime_disabled",
	}),
};

/**
 * Builds the retrieval StateGraph bound to a validated KG artifact runtime.
 * Pass real structured/JEV adapters when AGENTIC_CHAT / BigQuery / JEV are on.
 */
export function createRagRetrievalRuntime(input: {
	knowledgeGraph: KnowledgeGraphRuntimeBinding;
	structuredCatalog?: BaseRagCatalogRepository;
	structuredRag?: BaseRag;
	primaryJev?: PrimaryJevRouter;
	structuredJev?: CatalogJevRouter;
	knowledgeGraphJev?: KnowledgeGraphOperationSelector;
	checkpointer?: BaseCheckpointSaver;
}): RagRetrievalRuntime {
	const base = {
		primaryJev: input.primaryJev ?? relationsPrimaryJev,
		structuredCatalog: input.structuredCatalog ?? unavailableStructuredCatalog,
		knowledgeGraphCatalog: input.knowledgeGraph.catalog,
		structuredJev: input.structuredJev ?? allowCatalogJev,
		knowledgeGraphJev: input.knowledgeGraphJev ?? denyKnowledgeGraphSelector,
		structuredRag: input.structuredRag ?? unavailableStructuredRag,
		knowledgeGraphRag: input.knowledgeGraph.rag,
	};
	const dependencies: RagStateGraphDependencies =
		input.checkpointer === undefined
			? base
			: { ...base, checkpointer: input.checkpointer };
	return {
		dependencies,
		graph: createRagStateGraph(dependencies),
	};
}
