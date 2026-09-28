import { modelUsageSchema } from "../../domain/control/contracts.js";
import type { DisclosureService } from "../disclosure/disclosure-service.js";
import type { FinalResponseGuardrail } from "../disclosure/final-response-guardrail.js";
import type { ResponseGenerator } from "../ports/control.js";
import type { GenerationPrivacyService } from "../privacy/generation-privacy-service.js";
import type { BudgetTracker } from "./budget-tracker.js";
import type {
	AuthorizedDecisionContext,
	DecisionStageContext,
	ResponseStageResult,
	RouteExecutionResult,
} from "./pipeline-contracts.js";
import { stableHash } from "./stable-hash.js";

export class AgentResponseStage {
	constructor(
		private readonly generator: ResponseGenerator,
		private readonly disclosure: DisclosureService,
		private readonly privacy: GenerationPrivacyService,
		private readonly finalGuardrail: FinalResponseGuardrail,
	) {}

	async executeOutOfDomain(
		input: DecisionStageContext,
	): Promise<ResponseStageResult> {
		const draft = outOfDomainResponses.out_of_domain ?? outOfDomainFallback;
		const sanitized = await this.finalGuardrail.sanitize(
			draft,
			input.request.traceId,
		);
		if (sanitized.status === "blocked") {
			return { status: "failed", reasonCode: sanitized.reasonCode };
		}
		return {
			status: "completed",
			response: sanitized.value,
			decisionId: stableHash({
				traceId: input.request.traceId,
				domain: input.signal?.domain ?? "out_of_domain",
				responseKey: "out_of_domain",
			}),
		};
	}

	async execute(
		input: AuthorizedDecisionContext,
		route: RouteExecutionResult,
		budget: BudgetTracker,
	): Promise<ResponseStageResult> {
		if (route.status !== "ready") {
			return {
				status: "failed",
				reasonCode:
					route.status === "pending_clarification"
						? "clarification_not_ready"
						: route.reasonCode,
			};
		}

		let draft: string;
		if (route.payload.kind === "legacy_response") {
			draft = route.payload.response;
		} else if (route.payload.kind === "out_of_domain") {
			draft =
				outOfDomainResponses[route.payload.responseKey] ?? outOfDomainFallback;
		} else {
			let context: unknown = null;
			if (route.payload.kind === "rag") {
				context = route.payload.evidence;
			}
			if (route.payload.kind === "database") {
				const allowed = await this.disclosure.authorize({
					session: input.session,
					purpose: "answer_user",
					value: route.payload.value,
				});
				if (allowed.status === "blocked") {
					return { status: "failed", reasonCode: allowed.reasonCode };
				}
				context = allowed.value;
			}

			const prepared = await this.privacy.prepare({
				session: input.session,
				purpose: "answer_user",
				value: context,
				traceId: input.request.traceId,
			});
			budget.consume("llmCalls");
			const invocation = await this.generator.composeResponse({
				prompt: input.prompt.content,
				state: input.state,
				authorizedResult: prepared.content,
				traceId: input.request.traceId,
			});
			const usage = modelUsageSchema.parse(invocation.usage);
			budget.consume("inputTokens", usage.inputTokens);
			budget.consume("outputTokens", usage.outputTokens);
			const replaced = await this.privacy.replaceValidated({
				session: input.session,
				draft: invocation.value,
				deidentified: prepared,
				traceId: input.request.traceId,
			});
			if (replaced.status === "blocked") {
				return { status: "failed", reasonCode: replaced.reasonCode };
			}
			draft = replaced.value;
		}

		if (route.payload.kind === "legacy_response") {
			const prepared = await this.privacy.prepare({
				session: input.session,
				purpose: "answer_user",
				value: null,
				traceId: input.request.traceId,
			});
			const replaced = await this.privacy.replaceValidated({
				session: input.session,
				draft,
				deidentified: prepared,
				traceId: input.request.traceId,
			});
			if (replaced.status === "blocked") {
				return { status: "failed", reasonCode: replaced.reasonCode };
			}
			draft = replaced.value;
		}

		const sanitized = await this.finalGuardrail.sanitize(
			draft,
			input.request.traceId,
		);
		if (sanitized.status === "blocked") {
			return { status: "failed", reasonCode: sanitized.reasonCode };
		}
		return {
			status: "completed",
			response: sanitized.value,
			decisionId: input.policy.decisionId,
		};
	}
}

const outOfDomainFallback =
	"No puedo ayudar con esa solicitud. Puedo ayudarte con soporte bancario autorizado.";
const outOfDomainResponses: Readonly<Record<string, string>> = {
	out_of_domain: outOfDomainFallback,
};
