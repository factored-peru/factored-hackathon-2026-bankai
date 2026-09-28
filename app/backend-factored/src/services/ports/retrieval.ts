import type { QueryPlan } from "../../domain/data/query-plan.js";
import type {
	KnowledgeChunk,
	RetrievalQuery,
} from "../../domain/retrieval/contracts.js";

export interface KnowledgeRetriever {
	search(query: RetrievalQuery): Promise<KnowledgeChunk[]>;
}

export interface QueryPlanExecutor {
	execute(plan: QueryPlan, tenantId: string): Promise<unknown[]>;
}
