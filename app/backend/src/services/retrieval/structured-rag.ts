import { BaseRag, type RagExecutionResult } from "./base-rag.js";

/** Structured RAG is a closed BigQuery catalog, never text-to-SQL. */
export class StructuredRag extends BaseRag {
	readonly kind = "structured" as const;

	async execute(): Promise<RagExecutionResult> {
		// TODO: resolve a catalog entry to a parameterized QueryPlan and EvidenceDTO.
		return { status: "failed", reasonCode: "structured_rag_not_connected" };
	}
}
