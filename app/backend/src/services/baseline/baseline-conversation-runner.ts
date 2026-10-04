import type {
	BaselineChatModel,
	BaselineContextTool,
	BaselineRunMeasurement,
	BaselineRunObserver,
} from "../ports/baseline-chat.js";
import type { ConversationRunner } from "../ports/conversation.js";
import { BASELINE_SYSTEM_PROMPT } from "./bankai-table-declaration.js";

type BaselineConversationRunnerOptions = Readonly<{
	model: BaselineChatModel;
	tool: BaselineContextTool;
	maxRetrievalAttempts: number;
	observer?: BaselineRunObserver;
	nowMs?: () => number;
}>;

/**
 * Deliberately ungated comparator. It does not import the control plane or any
 * data adapter, so it cannot silently acquire its authorization or retrieval
 * behavior. Use only with an explicit process-level opt-in.
 */
export class BaselineConversationRunner {
	private readonly nowMs: () => number;

	constructor(private readonly options: BaselineConversationRunnerOptions) {
		this.nowMs = options.nowMs ?? (() => performance.now());
	}

	readonly run: ConversationRunner = async (input) => {
		const startedAt = this.nowMs();
		let modelCallCount = 0;
		let retrievalAttemptCount = 0;
		let retrievalSuccessCount = 0;
		try {
			const tool = await this.options.tool.describe();
			const first = await this.options.model.begin({
				system: BASELINE_SYSTEM_PROMPT,
				user: input.message,
				tool,
			});
			modelCallCount += 1;
			let turn = first;
			while (turn.kind === "tool_call") {
				if (retrievalAttemptCount >= this.options.maxRetrievalAttempts) {
					return await this.complete(
						input,
						startedAt,
						"No se pudo completar la recuperación de contexto.",
						modelCallCount,
						retrievalAttemptCount,
						retrievalSuccessCount,
						"baseline_tool_attempts_exhausted",
					);
				}
				retrievalAttemptCount += 1;
				await input.onState?.("retrieving");
				const result = await this.options.tool.retrieve({
					call: turn.call,
					session: input.session,
					traceId: input.traceId,
				});
				if (result.status === "ready") retrievalSuccessCount += 1;
				turn = await this.options.model.continue({
					system: BASELINE_SYSTEM_PROMPT,
					user: input.message,
					tool,
					call: turn.call,
					result,
				});
				modelCallCount += 1;
			}
			if (turn.text === undefined || turn.text.trim().length === 0) {
				throw new Error("baseline_model_no_response");
			}
			return await this.complete(
				input,
				startedAt,
				turn.text,
				modelCallCount,
				retrievalAttemptCount,
				retrievalSuccessCount,
				null,
			);
		} catch (error) {
			await this.record(
				input.traceId,
				startedAt,
				"failed",
				modelCallCount,
				retrievalAttemptCount,
				retrievalSuccessCount,
				error instanceof Error && error.message === "baseline_model_no_response"
					? "baseline_model_no_response"
					: "baseline_model_failure",
			);
			throw error;
		}
	};

	private async complete(
		input: Parameters<ConversationRunner>[0],
		startedAt: number,
		response: string,
		modelCallCount: number,
		retrievalAttemptCount: number,
		retrievalSuccessCount: number,
		errorCode: BaselineRunMeasurement["errorCode"],
	) {
		await input.onState?.("generating");
		for (const chunk of response.match(/\S+\s*/g) ?? [])
			await input.onDelta(chunk);
		await this.record(
			input.traceId,
			startedAt,
			"completed",
			modelCallCount,
			retrievalAttemptCount,
			retrievalSuccessCount,
			errorCode,
		);
		return { status: "completed" as const, response };
	}

	private async record(
		traceId: string,
		startedAt: number,
		outcome: BaselineRunMeasurement["outcome"],
		modelCallCount: number,
		retrievalAttemptCount: number,
		retrievalSuccessCount: number,
		errorCode: BaselineRunMeasurement["errorCode"],
	): Promise<void> {
		const measurement: BaselineRunMeasurement = {
			traceId,
			pipeline: "baseline",
			outcome,
			durationMs: Math.max(0, this.nowMs() - startedAt),
			modelCallCount,
			retrievalAttemptCount,
			retrievalSuccessCount,
			controlPlaneInvoked: false,
			privacyGateInvoked: false,
			guardrailInvoked: false,
			retrievalInvoked: retrievalAttemptCount > 0,
			errorCode,
		};
		try {
			await this.options.observer?.record(measurement);
		} catch {
			// Observability must not make the already-ungated comparator unavailable.
		}
	}
}
