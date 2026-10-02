import {
	type KnowledgeChunk,
	knowledgeChunkSchema,
	type RetrievalResult,
} from "../../domain/retrieval/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import type { GuardrailProvider } from "../ports/control.js";
import type { KnowledgeRetriever } from "../ports/retrieval.js";

export class RetrievalService {
	constructor(
		private readonly retriever: KnowledgeRetriever,
		private readonly guardrail: GuardrailProvider,
	) {}

	async retrieve(input: {
		query: string;
		session: SessionContext;
		maxChunks: number;
		allowedSources: string[];
		traceId: string;
	}): Promise<RetrievalResult> {
		let candidates: KnowledgeChunk[];
		try {
			candidates = await this.retriever.search({
				query: input.query,
				tenantId: input.session.tenantId,
				maxChunks: input.maxChunks,
				allowedSources: [...input.allowedSources],
			});
		} catch {
			return { status: "failed", reasonCode: "retrieval_unavailable" };
		}

		const chunks = [];
		for (const candidate of candidates.slice(0, input.maxChunks)) {
			const parsed = knowledgeChunkSchema.safeParse(candidate);
			if (!parsed.success) {
				return { status: "blocked", reasonCode: "invalid_provenance" };
			}
			if (
				parsed.data.tenantId !== input.session.tenantId ||
				!input.allowedSources.includes(parsed.data.sourceId)
			) {
				return { status: "blocked", reasonCode: "retrieval_scope_violation" };
			}

			const inspection = await this.guardrail.inspect({
				surface: "retrieved_content",
				content: parsed.data.content,
				classification: parsed.data.classification,
				traceId: input.traceId,
			});
			if (
				inspection.status !== "NO_MATCH_FOUND" ||
				inspection.action !== "allow"
			) {
				return {
					status: "blocked",
					reasonCode: `retrieval_guardrail_${inspection.status.toLowerCase()}`,
				};
			}
			chunks.push(parsed.data);
		}

		return { status: "succeeded", chunks };
	}
}
