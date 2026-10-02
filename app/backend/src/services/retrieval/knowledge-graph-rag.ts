import { BaseRag, type RagExecutionResult } from "./base-rag.js";

/** KG-RAG is a closed operation catalog over a versioned graph artifact. */
export class KnowledgeGraphRag extends BaseRag {
	readonly kind = "knowledge_graph" as const;

	async execute(): Promise<RagExecutionResult> {
		// TODO: validate current.json, manifest and checksum before loading graph-vN.msgpack.
		return { status: "failed", reasonCode: "kg_rag_not_connected" };
	}
}
