import type { QueryPlan } from "../../domain/data/query-plan.js";
import type {
	KnowledgeChunk,
	RetrievalQuery,
} from "../../domain/retrieval/contracts.js";

export interface KnowledgeRetriever {
	/**
	 * TODO(vector-rag): this legacy chunk interface is intentionally disconnected
	 * from the control plane. There is no approved corpus or vector store yet.
	 */
	search(query: RetrievalQuery): Promise<KnowledgeChunk[]>;
}

export interface QueryPlanExecutor {
	execute(plan: QueryPlan, tenantId: string): Promise<unknown[]>;
}
