import type { WorkflowService } from "../../workflows/workflow-service.js";
import type { BudgetTracker } from "../budget-tracker.js";
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
			const question = clarificationQuestions[questionKey];
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
