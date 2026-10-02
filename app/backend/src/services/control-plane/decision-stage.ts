import type { DecisionRouteKind } from "../../domain/control/contracts.js";
import {
	decisionSignalSchema,
	guardrailResultSchema,
	modelDecisionSchema,
	modelUsageSchema,
} from "../../domain/control/contracts.js";
import type {
	DecisionModelProvider,
	DecisionSignalProvider,
	GuardrailProvider,
} from "../ports/control.js";
import type { BudgetTracker } from "./budget-tracker.js";
import type {
	DecisionStageContext,
	DecisionStageResult,
	InputStageContext,
	NormalizedRoute,
} from "./pipeline-contracts.js";

export function normalizeRoute(
	decision: DecisionStageContext["modelDecision"],
): NormalizedRoute {
	if (decision.kind === "respond") {
		return { route: "llm", legacyResponse: decision.response };
	}
	if (decision.kind === "tool") {
		return { route: "database", call: decision.call };
	}
	return decision;
}

const defaultDomainConfidenceThreshold = 0.85;
const defaultRouteConfidenceThreshold = 0.85;

export type DecisionGateOptions = Readonly<{
	domainConfidenceThreshold?: number;
	routeConfidenceThreshold?: number;
}>;

function gatedRoute(input: {
	domain: "in_domain" | "out_of_domain" | "ambiguous";
	routeHint: "llm" | "rag" | "database" | "clarify" | "reject";
	domainConfidence: number;
	routeConfidence: number;
	domainConfidenceThreshold: number;
	routeConfidenceThreshold: number;
}): Extract<NormalizedRoute, { route: "clarify" | "out_of_domain" }> | null {
	if (
		input.domain === "out_of_domain" &&
		input.domainConfidence >= input.domainConfidenceThreshold
	) {
		return { route: "out_of_domain", responseKey: "out_of_domain" };
	}
	if (
		input.domain === "ambiguous" ||
		input.domainConfidence < input.domainConfidenceThreshold
	) {
		return {
			route: "clarify",
			question: "clarify_domain",
		};
	}
	if (
		input.routeHint === "clarify" &&
		input.routeConfidence >= input.routeConfidenceThreshold
	) {
		return {
			route: "clarify",
			question: "clarify_domain",
		};
	}
	return null;
}

export class AgentDecisionStage {
	constructor(
		private readonly signalProvider: DecisionSignalProvider,
		private readonly model: DecisionModelProvider,
		private readonly guardrail: GuardrailProvider,
		private readonly options: DecisionGateOptions = {},
	) {}

	async execute(
		input: InputStageContext,
		budget: BudgetTracker,
	): Promise<DecisionStageResult> {
		const rawSignal = await this.signalProvider.assess({
			prompt: input.prompt.content,
			state: input.state,
			traceId: input.request.traceId,
		});
		if (!rawSignal) {
			return { status: "failed", reasonCode: "jev_unavailable" };
		}
		const signal = decisionSignalSchema.parse(rawSignal);
		const jevRoute = gatedRoute({
			...signal,
			domainConfidenceThreshold:
				this.options.domainConfidenceThreshold ??
				defaultDomainConfidenceThreshold,
			routeConfidenceThreshold:
				this.options.routeConfidenceThreshold ??
				defaultRouteConfidenceThreshold,
		});
		if (jevRoute) {
			const modelDecision =
				jevRoute.route === "out_of_domain"
					? {
							kind: "route" as const,
							route: "out_of_domain" as const,
							responseKey: jevRoute.responseKey,
						}
					: {
							kind: "route" as const,
							route: "clarify" as const,
							question: jevRoute.question,
						};
			return {
				...input,
				signal,
				modelDecision,
				route: jevRoute,
			};
		}

		budget.consume("llmCalls");
		const invocation = await this.model.decide({
			prompt: input.prompt.content,
			state: input.state,
			evidence: [],
			traceId: input.request.traceId,
		});
		const usage = modelUsageSchema.parse(invocation.usage);
		budget.consume("inputTokens", usage.inputTokens);
		budget.consume("outputTokens", usage.outputTokens);

		const inspection = guardrailResultSchema.parse(
			await this.guardrail.inspect({
				surface: "model_output",
				content: JSON.stringify(invocation.value),
				classification: "internal",
				traceId: input.request.traceId,
			}),
		);
		if (
			inspection.status !== "NO_MATCH_FOUND" ||
			inspection.action !== "allow"
		) {
			return {
				status: "failed",
				reasonCode: `model_guardrail_${inspection.status.toLowerCase()}`,
			};
		}

		const parsed = modelDecisionSchema.safeParse(invocation.value);
		if (!parsed.success) {
			return { status: "failed", reasonCode: "invalid_model_decision" };
		}
		const modelDecision = parsed.data;
		const route = normalizeRoute(modelDecision);
		if (
			signal.allowedRoutes !== undefined &&
			!signal.allowedRoutes.includes(route.route as DecisionRouteKind)
		) {
			return { status: "failed", reasonCode: "jev_route_conflict" };
		}
		return {
			...input,
			signal,
			modelDecision,
			route,
		};
	}
}
