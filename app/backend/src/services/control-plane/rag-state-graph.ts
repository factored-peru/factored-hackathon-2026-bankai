import {
	Annotation,
	type BaseCheckpointSaver,
	END,
	START,
	StateGraph,
} from "@langchain/langgraph";
import type { SessionContext } from "../../domain/session.js";
import type { BaseRag } from "../retrieval/base-rag.js";
import type {
	BaseRagCatalogRepository,
	RagCatalog,
} from "../retrieval/rag-catalog.js";
import { stableHash } from "./stable-hash.js";

export type PrimaryJevRoute = "llm" | "database" | "relations" | "ood";

/**
 * One prior message of the thread. `content` must already be de-identified by
 * the input stage: the graph never receives or persists raw user text.
 */
export type ConversationTurn = Readonly<{
	role: "user" | "assistant";
	content: string;
}>;

/** Upper bound of turns kept per thread so memory and JEV input stay bounded. */
export const MAX_CONVERSATION_TURNS = 20;

export interface PrimaryJevRouter {
	assess(input: {
		query: string;
		/** Prior turns of this thread, excluding the current `query`. */
		history: readonly ConversationTurn[];
		session: SessionContext;
		traceId: string;
	}): Promise<PrimaryJevRoute>;
}

export interface CatalogJevRouter {
	assess(input: {
		query: string;
		session: SessionContext;
		catalog: RagCatalog;
		traceId: string;
	}): Promise<boolean>;
}

const ragState = Annotation.Root({
	query: Annotation<string>,
	session: Annotation<SessionContext>,
	traceId: Annotation<string>,
	route: Annotation<PrimaryJevRoute>,
	catalog: Annotation<RagCatalog | null>,
	terminalReason: Annotation<string | null>,
	// Persisted per thread by the checkpointer; `begin_turn` appends the user turn.
	history: Annotation<ConversationTurn[]>({
		default: () => [],
		reducer: (left, right) =>
			[...left, ...right].slice(-MAX_CONVERSATION_TURNS),
	}),
	// `null` resets the trace at the start of each turn.
	executionOrder: Annotation<string[], string[] | null>({
		default: () => [],
		reducer: (left, right) => (right === null ? [] : [...left, ...right]),
	}),
});

export type RagState = typeof ragState.State;

export type RagStateGraphDependencies = Readonly<{
	primaryJev: PrimaryJevRouter;
	structuredCatalog: BaseRagCatalogRepository;
	knowledgeGraphCatalog: BaseRagCatalogRepository;
	structuredJev: CatalogJevRouter;
	knowledgeGraphJev: CatalogJevRouter;
	structuredRag: BaseRag;
	knowledgeGraphRag: BaseRag;
	/** Thread memory. Omit for stateless runs; inject an adapter per environment. */
	checkpointer?: BaseCheckpointSaver;
}>;

/**
 * Binds a LangGraph thread to the authenticated session so a revoked, rotated
 * or foreign session can never resume another thread's history.
 */
export function ragThreadConfig(session: SessionContext, threadId: string) {
	return {
		configurable: {
			thread_id: stableHash({
				tenantId: session.tenantId,
				userId: session.userId,
				sessionId: session.sessionId,
				threadId,
			}),
		},
	};
}

/**
 * Explicit retrieval branch of the online control plane.
 *
 * TODO(react): decide whether a bounded ReAct loop belongs here. Until then,
 * this StateGraph keeps routing deterministic and does not use a prebuilt
 * LangGraph ReAct agent or an autonomous tool loop.
 */
export function createRagStateGraph(dependencies: RagStateGraphDependencies) {
	const append = (step: string) => ({ executionOrder: [step] });
	const graph = new StateGraph(ragState)
		// Per-turn fields must not leak from the previous turn of the same thread.
		.addNode("begin_turn", (state) => ({
			executionOrder: null,
			terminalReason: null,
			catalog: null,
			history: [{ role: "user" as const, content: state.query }],
		}))
		.addNode("primary_jev", async (state) => ({
			...append("primary_jev"),
			route: await dependencies.primaryJev.assess({
				query: state.query,
				// The current turn was just appended by `begin_turn`.
				history: state.history.slice(0, -1),
				session: state.session,
				traceId: state.traceId,
			}),
		}))
		.addNode("structured_catalog", async (state) => {
			const result = await dependencies.structuredCatalog.load({
				session: state.session,
				traceId: state.traceId,
			});
			return result.status === "ready"
				? { ...append("structured_catalog"), catalog: result.catalog }
				: {
						...append("structured_catalog"),
						terminalReason: result.reasonCode,
					};
		})
		.addNode("structured_jev", async (state) => {
			if (state.catalog === null) {
				return {
					...append("structured_jev"),
					terminalReason: "structured_catalog_missing",
				};
			}
			const allowed = await dependencies.structuredJev.assess({
				query: state.query,
				session: state.session,
				catalog: state.catalog,
				traceId: state.traceId,
			});
			return allowed
				? append("structured_jev")
				: {
						...append("structured_jev"),
						terminalReason: "structured_jev_denied",
					};
		})
		.addNode("structured_rag", async (state) => {
			if (state.catalog === null) {
				return {
					...append("structured_rag"),
					terminalReason: "structured_catalog_missing",
				};
			}
			const result = await dependencies.structuredRag.execute({
				query: state.query,
				session: state.session,
				catalog: state.catalog,
				traceId: state.traceId,
			});
			return result.status === "ready"
				? append("structured_rag")
				: { ...append("structured_rag"), terminalReason: result.reasonCode };
		})
		.addNode("kg_catalog", async (state) => {
			const result = await dependencies.knowledgeGraphCatalog.load({
				session: state.session,
				traceId: state.traceId,
			});
			return result.status === "ready"
				? { ...append("kg_catalog"), catalog: result.catalog }
				: { ...append("kg_catalog"), terminalReason: result.reasonCode };
		})
		.addNode("kg_jev", async (state) => {
			if (state.catalog === null) {
				return { ...append("kg_jev"), terminalReason: "kg_catalog_missing" };
			}
			const allowed = await dependencies.knowledgeGraphJev.assess({
				query: state.query,
				session: state.session,
				catalog: state.catalog,
				traceId: state.traceId,
			});
			return allowed
				? append("kg_jev")
				: { ...append("kg_jev"), terminalReason: "kg_jev_denied" };
		})
		.addNode("kg_rag", async (state) => {
			if (state.catalog === null) {
				return { ...append("kg_rag"), terminalReason: "kg_catalog_missing" };
			}
			const result = await dependencies.knowledgeGraphRag.execute({
				query: state.query,
				session: state.session,
				catalog: state.catalog,
				traceId: state.traceId,
			});
			return result.status === "ready"
				? append("kg_rag")
				: { ...append("kg_rag"), terminalReason: result.reasonCode };
		})
		.addEdge(START, "begin_turn")
		.addEdge("begin_turn", "primary_jev")
		.addConditionalEdges("primary_jev", (state) => state.route, {
			llm: END,
			ood: END,
			database: "structured_catalog",
			relations: "kg_catalog",
		})
		.addConditionalEdges("structured_catalog", (state) =>
			state.terminalReason === null ? "structured_jev" : END,
		)
		.addConditionalEdges("structured_jev", (state) =>
			state.terminalReason === null ? "structured_rag" : END,
		)
		.addEdge("structured_rag", END)
		.addConditionalEdges("kg_catalog", (state) =>
			state.terminalReason === null ? "kg_jev" : END,
		)
		.addConditionalEdges("kg_jev", (state) =>
			state.terminalReason === null ? "kg_rag" : END,
		)
		.addEdge("kg_rag", END);

	return graph.compile(
		dependencies.checkpointer
			? { checkpointer: dependencies.checkpointer }
			: {},
	);
}
