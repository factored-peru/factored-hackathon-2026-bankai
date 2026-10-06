import { createHash, randomUUID } from "node:crypto";
import type { SessionContext } from "../../domain/session.js";
import { BaselineConversationRunner } from "../baseline/baseline-conversation-runner.js";
import type {
	BaselineChatModel,
	BaselineContextTool,
	BaselineToolCall,
	BaselineToolResult,
} from "../ports/baseline-chat.js";
import {
	type ComparablePipelineRunner,
	type EvaluationScenario,
	type PipelineRunRecord,
	parsePipelineRunRecord,
} from "./ab-contracts.js";

/** Allowlisted QueryPlans exposed to the baseline tool in A/B (matches catalog). */
const AB_BASELINE_QUERY_PLANS = [
	{
		queryId: "customer_products",
		version: "v1",
		description:
			"Lists the products (cards and accounts) owned by the customer with their status and balance.",
	},
	{
		queryId: "product_status",
		version: "v1",
		description:
			"Status, balance and limits of one product owned by the customer.",
	},
	{
		queryId: "recent_transactions",
		version: "v1",
		description: "Recent transactions for a customer product.",
	},
] as const;

const ALLOWED_PLAN_IDS = new Set(
	AB_BASELINE_QUERY_PLANS.map((plan) => plan.queryId),
);

function demoSession(actorId: string): SessionContext {
	return {
		sessionId: "ab-local-session",
		userId: actorId,
		tenantId: "demo-bankai",
		scopes: ["dispute:read"],
		roles: ["customer"],
		capabilities: ["dispute.read", "conversation:write"],
		sessionVersion: 1,
		createdAt: "2026-10-05T00:00:00.000Z",
		lastSeenAt: "2026-10-05T00:00:00.000Z",
		expiresAt: "2026-10-05T01:00:00.000Z",
		revokedAt: null,
	};
}

/**
 * Scripted double for unit tests: forces tool use from scenario expectations.
 * Live Vertex models replace this via `BaselineComparableRunnerOptions.model`.
 */
function createScriptedBaselineModel(
	scenario: EvaluationScenario,
): BaselineChatModel {
	return {
		async begin() {
			if (
				scenario.expectedTerminalStatus === "failed" &&
				scenario.expectedRoute === "ood"
			) {
				return { kind: "final", text: "synthetic-ood-baseline" };
			}
			if (scenario.expectedRetrieval && scenario.expectedQueryPlanId) {
				const call: BaselineToolCall = {
					name: "retrieve_context",
					args: {
						queryId: scenario.expectedQueryPlanId,
						version: "v1",
						parameters: {},
					},
					callId: "ab-baseline-1",
				};
				return { kind: "tool_call", call };
			}
			return { kind: "final", text: "synthetic-baseline-final" };
		},
		async continue() {
			return { kind: "final", text: "synthetic-baseline-after-tool" };
		},
	};
}

export type BaselineComparableRunnerOptions = Readonly<{
	/** Live Vertex (or other) model. When omitted, uses a scripted double. */
	model?: BaselineChatModel;
	modelId?: string;
}>;

/**
 * Ungated baseline comparable. Defaults to a scripted double for tests; pass a
 * real `BaselineChatModel` from eval:compare so BASELINE_SYSTEM_PROMPT reaches
 * the provider. Absence of gates is comparative evidence, not a failure.
 */
export class BaselineComparableRunner implements ComparablePipelineRunner {
	readonly pipeline = "baseline" as const;

	constructor(private readonly options: BaselineComparableRunnerOptions = {}) {}

	async run(scenario: EvaluationScenario): Promise<PipelineRunRecord> {
		const started = performance.now();
		let modelCallCount = 0;
		let retrievalAttemptCount = 0;
		let retrievalSuccessCount = 0;
		let aggregatedRowCount = 0;
		let aggregatedBytes = 0;
		let queryPlanId: string | null = null;
		let toolOutcome: PipelineRunRecord["toolOutcome"] = "none";
		let errorCode: string | null = null;
		let status: PipelineRunRecord["status"] = "completed";
		const modelId = this.options.modelId ?? "baseline-ab-double";
		const liveModel = this.options.model !== undefined;

		const tool: BaselineContextTool = {
			async describe() {
				return {
					name: "retrieve_context",
					description: `Retrieve customer context using exactly one QueryPlan: ${JSON.stringify(AB_BASELINE_QUERY_PLANS)}`,
					parametersJsonSchema: {
						type: "object",
						additionalProperties: false,
						required: ["queryId", "version", "parameters"],
						properties: {
							queryId: { type: "string" },
							version: { type: "string" },
							parameters: { type: "object" },
						},
					},
				};
			},
			async retrieve({ call }) {
				retrievalAttemptCount += 1;
				const args = (call.args ?? {}) as {
					queryId?: string;
					version?: string;
				};
				const plan = args.queryId ?? "unknown_plan";
				queryPlanId = plan;
				const version = args.version ?? "v1";
				if (!ALLOWED_PLAN_IDS.has(plan)) {
					toolOutcome = "failed";
					return {
						status: "failed",
						queryId: plan,
						queryVersion: version,
						rows: [],
						rowCount: 0,
						bytesProcessed: 0,
						durationMs: 1,
						reasonCode: "baseline_query_plan_unknown",
					} satisfies BaselineToolResult;
				}
				// Scripted double: fail retrieval when the scenario does not expect it.
				// Live LLM: serve allowlisted plans (ungated baseline can still query).
				if (!liveModel && !scenario.expectedRetrieval) {
					toolOutcome = "failed";
					return {
						status: "failed",
						queryId: plan,
						queryVersion: version,
						rows: [],
						rowCount: 0,
						bytesProcessed: 0,
						durationMs: 1,
						reasonCode: "baseline_retrieval_not_expected",
					} satisfies BaselineToolResult;
				}
				retrievalSuccessCount += 1;
				aggregatedRowCount = 1;
				aggregatedBytes = 64;
				toolOutcome = "ready";
				return {
					status: "ready",
					queryId: plan,
					queryVersion: version,
					rows: [{ synthetic_flag: true, query_id: plan }],
					rowCount: 1,
					bytesProcessed: 64,
					durationMs: 2,
					reasonCode: null,
				};
			},
		};

		const inner = this.options.model ?? createScriptedBaselineModel(scenario);
		const model: BaselineChatModel = {
			async begin(input) {
				modelCallCount += 1;
				return inner.begin(input);
			},
			async continue(input) {
				modelCallCount += 1;
				return inner.continue(input);
			},
		};

		const runner = new BaselineConversationRunner({
			model,
			tool,
			maxRetrievalAttempts: 2,
			modelId,
		});
		const session = demoSession(scenario.actorId);
		try {
			const result = await runner.run({
				session,
				threadId: `ab-${scenario.scenarioId}`,
				traceId: `ab-baseline-${scenario.scenarioId}`,
				message: scenario.prompt,
				onDelta: async () => undefined,
			});
			if (result.status === "failed") {
				status = "failed";
				errorCode = result.reasonCode ?? "baseline_failed";
			} else {
				status = "completed";
			}
		} catch (error) {
			status = "failed";
			errorCode =
				error instanceof Error ? error.message.slice(0, 64) : "baseline_error";
		}

		return parsePipelineRunRecord({
			runId: `baseline-${scenario.scenarioId}-${randomUUID().slice(0, 8)}`,
			scenarioId: scenario.scenarioId,
			snapshotId: scenario.snapshotId,
			pipeline: "baseline",
			status,
			// Ungated baseline has no control-plane router; trajectory reference is llm.
			route: "llm",
			queryPlanId,
			catalogVersion: queryPlanId !== null ? "v1" : null,
			policyVersion: null,
			modelVersion: modelId,
			durationMs: Math.max(0, Math.round(performance.now() - started)),
			modelCallCount,
			retrievalAttemptCount,
			retrievalSuccessCount,
			aggregatedRowCount,
			aggregatedBytes,
			toolOutcome,
			errorCode,
			gatesInvoked: {
				controlPlane: false,
				privacy: false,
				guardrail: false,
				policy: false,
			},
		});
	}
}

/** Opaque fingerprint for local pairing — not a session id. */
export function scenarioPairKey(scenario: EvaluationScenario): string {
	return createHash("sha256")
		.update(`${scenario.snapshotId}\0${scenario.scenarioId}`)
		.digest("hex")
		.slice(0, 16);
}
