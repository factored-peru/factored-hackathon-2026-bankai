/**
 * Composition root for the retrieval StateGraph with a published KG runtime.
 *
 * ADR 0004: catalog -> specialized JEV -> policy -> RAG for Structured and KG.
 * Selectors stay opt-in behind JEV/Vertex flags; defaults deny fail-closed.
 * Default retrieval policy is capability-gated (allow/deny/clarify); escalate
 * remains on conversational policy only.
 */
import type { BaseCheckpointSaver } from "@langchain/langgraph";
import type { ImmutableKnowledgeGraphArtifactRepository } from "../retrieval/knowledge-graph-artifacts.js";
import type { KnowledgeGraphRag } from "../retrieval/knowledge-graph-rag.js";
import type { KnowledgeGraphOperationSelector } from "../retrieval/knowledge-graph-selection.js";
import type { BaseRagCatalogRepository } from "../retrieval/rag-catalog.js";
import type {
	StructuredQuerySelector,
	StructuredRagExecutor,
} from "../retrieval/structured-rag.js";
import { capabilityRetrievalPolicy } from "./capability-retrieval-policy.js";
import {
	createRagStateGraph,
	type PrimaryJevRouter,
	type RagStateGraphDependencies,
	type RetrievalPolicyGate,
} from "./rag-state-graph.js";

export type RagRetrievalRuntime = Readonly<{
	graph: ReturnType<typeof createRagStateGraph>;
	dependencies: RagStateGraphDependencies;
}>;

export type KnowledgeGraphRuntimeBinding = Readonly<{
	catalog: ImmutableKnowledgeGraphArtifactRepository;
	rag: KnowledgeGraphRag;
}>;

/** Fail-closed KG JEV used until a production selector is composed. */
export const denyKnowledgeGraphSelector: KnowledgeGraphOperationSelector = {
	select: async () => ({ decision: "deny" as const }),
};

/** Fail-closed Structured JEV when BigQuery/JEV stack is not injected. */
export const denyStructuredSelector: StructuredQuerySelector = {
	select: async () => ({ decision: "deny" as const }),
};

export const relationsPrimaryJev: PrimaryJevRouter = {
	assess: async () => "relations",
};

const unavailableStructuredCatalog: BaseRagCatalogRepository = {
	kind: "structured",
	load: async () => ({
		status: "unavailable",
		reasonCode: "structured_runtime_disabled",
	}),
};

const unavailableStructuredRag: StructuredRagExecutor = {
	executeSelection: async () => ({
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
	structuredRag?: StructuredRagExecutor;
	primaryJev?: PrimaryJevRouter;
	structuredJev?: StructuredQuerySelector;
	knowledgeGraphJev?: KnowledgeGraphOperationSelector;
	retrievalPolicy?: RetrievalPolicyGate;
	checkpointer?: BaseCheckpointSaver;
}): RagRetrievalRuntime {
	const base = {
		primaryJev: input.primaryJev ?? relationsPrimaryJev,
		structuredCatalog: input.structuredCatalog ?? unavailableStructuredCatalog,
		knowledgeGraphCatalog: input.knowledgeGraph.catalog,
		structuredJev: input.structuredJev ?? denyStructuredSelector,
		knowledgeGraphJev: input.knowledgeGraphJev ?? denyKnowledgeGraphSelector,
		retrievalPolicy: input.retrievalPolicy ?? capabilityRetrievalPolicy,
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
