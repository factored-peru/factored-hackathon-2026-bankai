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

function mapRoute(scenario: EvaluationScenario): PipelineRunRecord["route"] {
	return scenario.expectedRoute === "deny" || scenario.expectedRoute === "hitl"
		? scenario.expectedRoute
		: scenario.expectedRoute;
}

/**
 * Ungated baseline comparable: doubles only, no control-plane imports.
 * Absence of gates is recorded as a comparative property, not a failure.
 */
export class BaselineComparableRunner implements ComparablePipelineRunner {
	readonly pipeline = "baseline" as const;

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

		const tool: BaselineContextTool = {
			async describe() {
				return {
					name: "retrieve_context",
					description: "synthetic baseline retrieval",
					parametersJsonSchema: {
						type: "object",
						properties: {
							queryId: { type: "string" },
							version: { type: "string" },
						},
						required: ["queryId", "version"],
					},
				};
			},
			async retrieve({ call }) {
				retrievalAttemptCount += 1;
				const args = (call.args ?? {}) as {
					queryId?: string;
					version?: string;
				};
				const plan =
					args.queryId ?? scenario.expectedQueryPlanId ?? "unknown_plan";
				queryPlanId = plan;
				if (!scenario.expectedRetrieval) {
					toolOutcome = "failed";
					return {
						status: "failed",
						queryId: plan,
						queryVersion: args.version ?? "v1",
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
					queryVersion: args.version ?? "v1",
					rows: [{ synthetic_flag: true }],
					rowCount: 1,
					bytesProcessed: 64,
					durationMs: 2,
					reasonCode: null,
				};
			},
		};

		const model: BaselineChatModel = {
			async begin() {
				modelCallCount += 1;
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
						},
						callId: "ab-baseline-1",
					};
					return { kind: "tool_call", call };
				}
				return { kind: "final", text: "synthetic-baseline-final" };
			},
			async continue() {
				modelCallCount += 1;
				return { kind: "final", text: "synthetic-baseline-after-tool" };
			},
		};

		const runner = new BaselineConversationRunner({
			model,
			tool,
			maxRetrievalAttempts: 2,
			modelId: "baseline-ab-double",
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
			route: mapRoute(scenario),
			queryPlanId,
			catalogVersion: scenario.expectedQueryPlanId ? "v1" : null,
			policyVersion: null,
			modelVersion: "baseline-ab-double",
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
