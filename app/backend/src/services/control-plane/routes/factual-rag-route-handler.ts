import type { SessionContext } from "../../../domain/session.js";
import type { RagCatalog } from "../../retrieval/rag-catalog.js";
import type { StructuredSelectDecision } from "../../retrieval/structured-rag.js";
import type { WorkflowService } from "../../workflows/workflow-service.js";
import type { BudgetTracker } from "../budget-tracker.js";
import {
	buildMissingParametersQuestion,
	missingCallerParameters,
	productListQueryId,
	productsFromEvidence,
} from "../clarification-question.js";
import {
	clarificationQuestionFor,
	mapRagTerminal,
	toDeniedOrFailed,
} from "../map-rag-terminal.js";
import type {
	AuthorizedDecisionContext,
	RouteExecutionResult,
} from "../pipeline-contracts.js";
import {
	createRagStateGraph,
	type PrimaryJevRoute,
	type RagStateGraphDependencies,
	ragThreadConfig,
} from "../rag-state-graph.js";
import type { AgentRouteHandler } from "../route-stage.js";

const clarificationQuestions = {
	clarify_domain: "¿Puedes precisar qué necesitas sobre soporte bancario?",
	clarify_account: "¿Qué cuenta autorizada deseas consultar?",
	clarify_period: "¿Qué periodo autorizado deseas consultar?",
} as const;

/**
 * ACS factual route that runs ADR 0004 StateGraph (catalog → JEV → policy → RAG)
 * and maps clarify/deny terminals into RouteExecutionResult.
 */
export class FactualRagRouteHandler implements AgentRouteHandler {
	constructor(
		readonly route: "database" | "rag",
		private readonly dependencies: RagStateGraphDependencies,
		private readonly workflows: WorkflowService,
	) {}

	/**
	 * Structured only: names the missing parameters and, when the product is
	 * missing, lists the customer's own products so they can answer with a code.
	 * Null keeps the generic question (and any failure while listing does too).
	 */
	private async missingParametersQuestion(input: {
		reasonCode: string;
		session: SessionContext;
		traceId: string;
		catalog: RagCatalog | null;
		selection: StructuredSelectDecision | null;
	}): Promise<string | null> {
		if (input.reasonCode !== "structured_parameters_missing") return null;
		const missing = missingCallerParameters(input);
		let products: ReturnType<typeof productsFromEvidence> = [];
		const listing = input.catalog?.entries.find(
			(entry) => entry.id === productListQueryId,
		);
		if (missing.includes("product_id") && input.catalog && listing) {
			try {
				const listed = await this.dependencies.structuredRag.executeSelection({
					session: input.session,
					catalog: input.catalog,
					selection: {
						decision: "select",
						queryId: listing.id,
						version: listing.version,
						parameters: {},
					},
					traceId: input.traceId,
				});
				if (listed.status === "ready") {
					products = productsFromEvidence(listed.evidence);
				}
			} catch {
				// The question is still useful without the list.
			}
		}
		return buildMissingParametersQuestion({ missing, products });
	}

	async execute(
		input: AuthorizedDecisionContext,
		budget: BudgetTracker,
	): Promise<RouteExecutionResult> {
		if (input.route.route !== this.route) {
			return { status: "failed", reasonCode: "route_handler_mismatch" };
		}
		const primaryRoute: PrimaryJevRoute =
			this.route === "database" ? "database" : "relations";
		const query =
			input.route.route === "rag" ? input.route.query : input.prompt.content;
		const graph = createRagStateGraph({
			...this.dependencies,
			primaryJev: { assess: async () => primaryRoute },
		});
		budget.consume("steps");
		const result = await graph.invoke(
			{
				query,
				session: input.session,
				traceId: input.request.traceId,
				route: primaryRoute,
				catalog: null,
				terminalReason: null,
				evidence: null,
			},
			ragThreadConfig(input.session, input.request.threadId),
		);
		const mapped = mapRagTerminal({
			terminalReason: result.terminalReason,
			evidence: result.evidence,
		});
		if (mapped.kind === "ready") {
			budget.consume("retrievedChunks", mapped.evidence.length);
			return {
				status: "ready",
				payload: { kind: "rag", evidence: [...mapped.evidence] },
			};
		}
		if (mapped.kind === "clarify") {
			const questionKey = clarificationQuestionFor(mapped.reasonCode);
			const question =
				(await this.missingParametersQuestion({
					reasonCode: mapped.reasonCode,
					session: input.session,
					traceId: input.request.traceId,
					catalog: result.catalog,
					selection: result.structuredSelection,
				})) ?? clarificationQuestions[questionKey];
			const pending = await this.workflows.requestClarification({
				session: input.session,
				threadId: input.request.threadId,
				question,
				decisionState: input.state,
				policyDecision: input.policy,
			});
			return {
				status: "pending_clarification",
				workflowId: pending.workflowId,
				clarificationId: pending.clarificationId,
				question,
			};
		}
		return toDeniedOrFailed(mapped);
	}
}
