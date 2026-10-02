import {
	decisionStateSchema,
	guardrailResultSchema,
} from "../../domain/control/contracts.js";
import type { SessionStore } from "../../domain/session.js";
import type { DecisionProjector, GuardrailProvider } from "../ports/control.js";
import type { PromptPrivacyService } from "../privacy/prompt-privacy-service.js";
import type { BudgetTracker } from "./budget-tracker.js";
import { normalizeUserMessage } from "./input-normalizer.js";
import type { AgentRequest, InputStageResult } from "./pipeline-contracts.js";

export class AgentInputStage {
	constructor(
		private readonly sessions: SessionStore,
		private readonly guardrail: GuardrailProvider,
		private readonly privacy: PromptPrivacyService,
		private readonly projector: DecisionProjector,
		private readonly now: () => Date = () => new Date(),
	) {}

	async execute(
		request: AgentRequest,
		budget: BudgetTracker,
	): Promise<InputStageResult> {
		budget.consume("steps");
		const session = await this.sessions.get(request.sessionId);
		if (
			!session ||
			session.revokedAt !== null ||
			!Number.isFinite(Date.parse(session.expiresAt)) ||
			Date.parse(session.expiresAt) <= this.now().getTime()
		) {
			return { status: "failed", reasonCode: "session_invalid" };
		}

		const normalized = normalizeUserMessage(request.message);
		if (normalized.status === "rejected") {
			return { status: "failed", reasonCode: normalized.reasonCode };
		}

		const prompt = await this.privacy.sanitizePrompt({
			session,
			content: normalized.content,
			traceId: request.traceId,
		});

		const inspection = guardrailResultSchema.parse(
			await this.guardrail.inspect({
				surface: "user_input",
				content: prompt.content,
				classification: "personal",
				traceId: request.traceId,
			}),
		);
		if (
			inspection.status !== "NO_MATCH_FOUND" ||
			inspection.action !== "allow"
		) {
			return {
				status: "failed",
				reasonCode: `input_guardrail_${inspection.status.toLowerCase()}`,
			};
		}

		budget.consume("steps");
		const state = decisionStateSchema.parse(
			await this.projector.project({
				message: prompt.content,
				session,
				evidence: [],
			}),
		);

		return { request, session, prompt, state };
	}
}
