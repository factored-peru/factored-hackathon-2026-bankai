import {
	Annotation,
	type BaseCheckpointSaver,
	END,
	START,
	StateGraph,
} from "@langchain/langgraph";
import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { KnowledgeGraphRagExecutor } from "../retrieval/knowledge-graph-rag.js";
import {
	type KnowledgeGraphOperationSelector,
	type KnowledgeGraphSelection,
	knowledgeGraphSelectionSchema,
} from "../retrieval/knowledge-graph-selection.js";
import type {
	BaseRagCatalogRepository,
	RagCatalog,
} from "../retrieval/rag-catalog.js";
import type {
	StructuredQuerySelector,
	StructuredRagExecutor,
	StructuredSelectDecision,
} from "../retrieval/structured-rag.js";
import { structuredSelectionSchema } from "../retrieval/structured-rag.js";
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
		history: readonly ConversationTurn[];
		session: SessionContext;
		traceId: string;
	}): Promise<PrimaryJevRoute>;
}

/**
 * ADR 0004 retrieval policy gate between specialized JEV and RAG execute.
 * Deny / clarify fail closed; allow proceeds to Structured or KG RAG.
 */
export interface RetrievalPolicyGate {
	authorize(input: {
		route: "database" | "relations";
		query: string;
		session: SessionContext;
		catalog: RagCatalog;
		traceId: string;
	}): Promise<"allow" | "deny" | "clarify">;
}

export const allowRetrievalPolicy: RetrievalPolicyGate = {
	authorize: async () => "allow",
};

const ragState = Annotation.Root({
	query: Annotation<string>,
	session: Annotation<SessionContext>,
	traceId: Annotation<string>,
	route: Annotation<PrimaryJevRoute>,
	catalog: Annotation<RagCatalog | null>,
	terminalReason: Annotation<string | null>,
	evidence: Annotation<readonly ModelEvidence[] | null>({
		value: (_left, right) => right,
		default: () => null,
	}),
	structuredSelection: Annotation<StructuredSelectDecision | null>({
		value: (_left, right) => right,
		default: () => null,
	}),
	knowledgeGraphSelection: Annotation<KnowledgeGraphSelection | null>({
		value: (_left, right) => right,
		default: () => null,
	}),
	history: Annotation<ConversationTurn[]>({
		default: () => [],
		reducer: (left, right) =>
			[...left, ...right].slice(-MAX_CONVERSATION_TURNS),
	}),
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
	/** Specialized Structured JEV (TypeSafe + params), not a boolean stub. */
	structuredJev: StructuredQuerySelector;
	knowledgeGraphJev: KnowledgeGraphOperationSelector;
	retrievalPolicy: RetrievalPolicyGate;
	structuredRag: StructuredRagExecutor;
	knowledgeGraphRag: KnowledgeGraphRagExecutor;
	checkpointer?: BaseCheckpointSaver;
}>;

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
 * Explicit retrieval branch of the online control plane (ADR 0004):
 * catalog -> specialized JEV -> policy -> RAG (Structured or KG).
 */
export function createRagStateGraph(dependencies: RagStateGraphDependencies) {
	const append = (step: string) => ({ executionOrder: [step] });
	const graph = new StateGraph(ragState)
		.addNode("begin_turn", (state) => ({
			executionOrder: null,
			terminalReason: null,
			catalog: null,
			evidence: null,
			structuredSelection: null,
			knowledgeGraphSelection: null,
			history: [{ role: "user" as const, content: state.query }],
		}))
		.addNode("primary_jev", async (state) => ({
			...append("primary_jev"),
			route: await dependencies.primaryJev.assess({
				query: state.query,
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
			let proposal: unknown;
			try {
				proposal = await dependencies.structuredJev.select({
					query: state.query,
					catalog: state.catalog,
					traceId: state.traceId,
				});
			} catch {
				return {
					...append("structured_jev"),
					terminalReason: "structured_jev_unavailable",
				};
			}
			const selection = structuredSelectionSchema.safeParse(proposal);
			if (!selection.success) {
				return {
					...append("structured_jev"),
					terminalReason: "structured_jev_invalid",
				};
			}
			if (selection.data.decision === "ambiguous") {
				return {
					...append("structured_jev"),
					terminalReason: "structured_selection_ambiguous",
				};
			}
			if (selection.data.decision === "deny") {
				return {
					...append("structured_jev"),
					terminalReason: "structured_jev_denied",
				};
			}
			const selected = selection.data;
			const listed = state.catalog.entries.some(
				(entry) =>
					entry.id === selected.queryId && entry.version === selected.version,
			);
			return listed
				? { ...append("structured_jev"), structuredSelection: selected }
				: {
						...append("structured_jev"),
						terminalReason: "structured_query_not_allowlisted",
					};
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
			let proposal: unknown;
			try {
				proposal = await dependencies.knowledgeGraphJev.select({
					query: state.query,
					catalog: state.catalog,
					traceId: state.traceId,
				});
			} catch {
				return { ...append("kg_jev"), terminalReason: "kg_jev_unavailable" };
			}
			const selection = knowledgeGraphSelectionSchema.safeParse(proposal);
			if (!selection.success) {
				return { ...append("kg_jev"), terminalReason: "kg_jev_invalid" };
			}
			if (selection.data.decision === "ambiguous") {
				return {
					...append("kg_jev"),
					terminalReason: "kg_selection_ambiguous",
				};
			}
			if (selection.data.decision === "deny") {
				return { ...append("kg_jev"), terminalReason: "kg_jev_denied" };
			}
			const selected = selection.data as Extract<
				KnowledgeGraphSelection,
				{ decision: "select" }
			>;
			const listed = state.catalog.entries.some(
				(entry) =>
					entry.id === selected.operationId &&
					entry.version === selected.version,
			);
			return listed
				? { ...append("kg_jev"), knowledgeGraphSelection: selected }
				: {
						...append("kg_jev"),
						terminalReason: "kg_operation_not_allowlisted",
					};
		})
		.addNode("retrieval_policy", async (state) => {
			if (state.catalog === null) {
				return {
					...append("retrieval_policy"),
					terminalReason: "retrieval_catalog_missing",
				};
			}
			if (state.route !== "database" && state.route !== "relations") {
				return {
					...append("retrieval_policy"),
					terminalReason: "retrieval_policy_route_invalid",
				};
			}
			const outcome = await dependencies.retrievalPolicy.authorize({
				route: state.route,
				query: state.query,
				session: state.session,
				catalog: state.catalog,
				traceId: state.traceId,
			});
			if (outcome === "allow") return append("retrieval_policy");
			return {
				...append("retrieval_policy"),
				terminalReason:
					outcome === "clarify"
						? "retrieval_policy_clarify"
						: "retrieval_policy_denied",
			};
		})
		.addNode("structured_rag", async (state) => {
			if (state.catalog === null) {
				return {
					...append("structured_rag"),
					terminalReason: "structured_catalog_missing",
				};
			}
			if (state.structuredSelection === null) {
				return {
					...append("structured_rag"),
					terminalReason: "structured_selection_missing",
				};
			}
			const result = await dependencies.structuredRag.executeSelection({
				session: state.session,
				catalog: state.catalog,
				selection: state.structuredSelection,
				traceId: state.traceId,
			});
			return result.status === "ready"
				? { ...append("structured_rag"), evidence: result.evidence }
				: { ...append("structured_rag"), terminalReason: result.reasonCode };
		})
		.addNode("kg_rag", async (state) => {
			if (state.catalog === null) {
				return { ...append("kg_rag"), terminalReason: "kg_catalog_missing" };
			}
			if (state.knowledgeGraphSelection === null) {
				return { ...append("kg_rag"), terminalReason: "kg_selection_missing" };
			}
			const result = await dependencies.knowledgeGraphRag.executeSelection({
				session: state.session,
				catalog: state.catalog,
				selection: state.knowledgeGraphSelection,
				traceId: state.traceId,
			});
			return result.status === "ready"
				? { ...append("kg_rag"), evidence: result.evidence }
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
			state.terminalReason === null ? "retrieval_policy" : END,
		)
		.addConditionalEdges("kg_catalog", (state) =>
			state.terminalReason === null ? "kg_jev" : END,
		)
		.addConditionalEdges("kg_jev", (state) =>
			state.terminalReason === null ? "retrieval_policy" : END,
		)
		.addConditionalEdges("retrieval_policy", (state) => {
			if (state.terminalReason !== null) return END;
			if (state.route === "database") return "structured_rag";
			if (state.route === "relations") return "kg_rag";
			return END;
		})
		.addEdge("structured_rag", END)
		.addEdge("kg_rag", END);

	return graph.compile(
		dependencies.checkpointer
			? { checkpointer: dependencies.checkpointer }
			: {},
	);
}
