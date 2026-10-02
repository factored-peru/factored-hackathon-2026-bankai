import type { ModelEvidence } from "../../../domain/retrieval/contracts.js";
import type { PromptPrivacyService } from "../../privacy/prompt-privacy-service.js";
import type { RetrievalService } from "../../retrieval/retrieval-service.js";
import type { BudgetTracker } from "../budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "../pipeline-contracts.js";
import type { AgentRouteHandler } from "../route-stage.js";

export class RagRouteHandler implements AgentRouteHandler {
	readonly route = "rag" as const;

	constructor(
		private readonly retrieval: RetrievalService,
		private readonly privacy: PromptPrivacyService,
	) {}

	async execute(
		input: AuthorizedDecisionContext,
		budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		if (input.route.route !== "rag") {
			return { status: "failed", reasonCode: "route_handler_mismatch" };
		}
		const query = await this.privacy.sanitizeQuery({
			session: input.session,
			content: input.route.query,
			traceId: input.request.traceId,
		});
		const result = await this.retrieval.retrieve({
			query: query.content,
			session: input.session,
			maxChunks: input.request.budget.maxRetrievedChunks,
			allowedSources: input.request.allowedSources,
			traceId: input.request.traceId,
		});
		if (result.status !== "succeeded") {
			return { status: "failed", reasonCode: result.reasonCode };
		}
		budget.consume("steps");
		budget.consume("retrievedChunks", result.chunks.length);
		if (
			result.chunks.some(
				(chunk) =>
					chunk.classification !== "public" &&
					chunk.classification !== "internal",
			)
		) {
			return {
				status: "failed",
				reasonCode: "evidence_not_allowed_for_model",
			};
		}
		const evidence: ModelEvidence[] = result.chunks.map((chunk) => ({
			content: chunk.content,
			documentRef: chunk.documentId,
			sourceType: chunk.sourceType,
			classification: chunk.classification,
			contentHash: chunk.contentHash,
		}));
		return { status: "ready", payload: { kind: "rag", evidence } };
	}
}
