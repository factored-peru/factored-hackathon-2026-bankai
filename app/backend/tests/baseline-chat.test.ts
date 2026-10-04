import { describe, expect, test } from "bun:test";
import { envSchema, validateRuntimeConfiguration } from "../src/config/env.js";
import type { SessionContext } from "../src/domain/session.js";
import { BASELINE_SYSTEM_PROMPT } from "../src/services/baseline/bankai-table-declaration.js";
import { BaselineConversationRunner } from "../src/services/baseline/baseline-conversation-runner.js";
import { BaselineChatEvaluator } from "../src/services/evaluation/baseline-chat-evaluator.js";
import {
	type BaselineContextTool,
	type BaselineRunMeasurement,
	baselineRetrievalToolName,
} from "../src/services/ports/baseline-chat.js";

const session: SessionContext = {
	sessionId: "session-private",
	userId: "user-private",
	tenantId: "tenant-private",
	roles: ["customer"],
	capabilities: [],
	scopes: [],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	revokedAt: null,
	expiresAt: "2026-01-01T00:00:00.000Z",
};

const toolDefinition = {
	name: baselineRetrievalToolName,
	description: "retrieve customer context",
	parametersJsonSchema: { type: "object" },
} as const;

describe("ungated baseline chat", () => {
	test("retrieves QueryPlan context, streams, and records metadata only", async () => {
		const measurements: BaselineRunMeasurement[] = [];
		const continuations: unknown[] = [];
		const states: string[] = [];
		const runner = new BaselineConversationRunner({
			model: {
				async begin(input) {
					expect(input).toEqual({
						system: BASELINE_SYSTEM_PROMPT,
						user: "¿Cuál es el estado de mi producto?",
						tool: toolDefinition,
					});
					return toolTurn("call-1");
				},
				async continue(input) {
					continuations.push(input.result);
					return { kind: "final", text: "Tu producto está activo." };
				},
			},
			tool: readyTool(),
			maxRetrievalAttempts: 2,
			observer: {
				async record(measurement) {
					measurements.push(measurement);
				},
			},
			nowMs: counterClock(),
		});
		const deltas: string[] = [];

		const result = await runner.run({
			session,
			threadId: "thread-private",
			traceId: "trace-safe",
			message: "¿Cuál es el estado de mi producto?",
			onState: async (state) => {
				states.push(state);
			},
			onDelta: async (value) => {
				deltas.push(value);
			},
		});

		expect(result).toEqual({
			status: "completed",
			response: "Tu producto está activo.",
		});
		expect(states).toEqual(["retrieving", "generating"]);
		expect(deltas.join("")).toBe("Tu producto está activo.");
		expect(continuations).toEqual([
			expect.objectContaining({
				status: "ready",
				rows: [{ product_id: "product-1", product_status: "active" }],
			}),
		]);
		expect(measurements).toEqual([
			expect.objectContaining({
				traceId: "trace-safe",
				outcome: "completed",
				modelCallCount: 2,
				retrievalAttemptCount: 1,
				retrievalSuccessCount: 1,
				controlPlaneInvoked: false,
				privacyGateInvoked: false,
				guardrailInvoked: false,
				retrievalInvoked: true,
				errorCode: null,
			}),
		]);
		expect(JSON.stringify(measurements)).not.toContain("¿Cuál es el estado");
	});

	test("allows at most two tool attempts and records exhaustion", async () => {
		const measurements: BaselineRunMeasurement[] = [];
		let continuations = 0;
		const runner = new BaselineConversationRunner({
			model: {
				async begin() {
					return toolTurn("call-1");
				},
				async continue() {
					continuations += 1;
					return toolTurn(`call-${continuations + 1}`);
				},
			},
			tool: failedTool(),
			maxRetrievalAttempts: 2,
			observer: {
				async record(measurement) {
					measurements.push(measurement);
				},
			},
			nowMs: counterClock(),
		});

		const result = await runner.run({
			session,
			threadId: "thread-private",
			traceId: "trace-safe",
			message: "consulta",
			onDelta: async () => {},
		});

		expect(continuations).toBe(2);
		expect(result).toEqual({
			status: "completed",
			response: "No se pudo completar la recuperación de contexto.",
		});
		expect(measurements[0]).toEqual(
			expect.objectContaining({
				retrievalAttemptCount: 2,
				retrievalSuccessCount: 0,
				errorCode: "baseline_tool_attempts_exhausted",
			}),
		);
	});

	test("requires explicit baseline, Vertex, BigQuery and demo runtime opt-ins", () => {
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({ CHAT_PIPELINE: "baseline" }),
			),
		).toThrow("SVC-CORE-9011");
		expect(
			validateRuntimeConfiguration(
				envSchema.parse({
					CHAT_PIPELINE: "baseline",
					BASELINE_CHAT_ENABLED: true,
					VERTEX_AI_ENABLED: true,
					VERTEX_AI_PROJECT_ID: "proj",
					VERTEX_AI_LOCATION: "us-central1",
					VERTEX_AI_MODEL: "model",
					BIGQUERY_ENABLED: true,
					GOOGLE_CLOUD_PROJECT: "proj",
					GOOGLE_CLOUD_LOCATION: "us-central1",
					BIGQUERY_DATASET: "dataset",
					DEMO_AUTH_ENABLED: true,
					DEMO_ACTOR_HMAC_KEY: "only-a-test-key",
					REALTIME_ENABLED: true,
					CORS_ALLOWED_ORIGINS: "http://localhost:3001",
				}),
			).CHAT_PIPELINE,
		).toBe("baseline");
	});

	test("labels ungated behavior and retrieval measurement as baseline-specific results", () => {
		const results = new BaselineChatEvaluator().evaluate({
			traceId: "trace-safe",
			fixtureId: "baseline-fixture",
			route: "llm",
			expectedRoute: "llm",
			trajectory: [],
			expectedTrajectory: [],
			policyAllowed: false,
			budgetExceeded: false,
			evidenceVersion: null,
			catalogLoaded: false,
			catalogLoadedBeforeSpecializedJev: false,
			tenantIsolated: false,
			guardrailPassed: false,
			responseContainsSensitiveContent: false,
			resultVerified: false,
			policyVersion: "none",
			catalogVersion: null,
			pipeline: "baseline",
			durationMs: 14,
			modelCallCount: 2,
			controlPlaneInvoked: false,
			privacyGateInvoked: false,
			guardrailInvoked: false,
			retrievalInvoked: true,
			retrievalAttemptCount: 1,
			retrievalSuccessCount: 1,
			errorCode: null,
		});
		expect(results).toHaveLength(4);
		expect(results.every((result) => result.passed)).toBe(true);
	});
});

function readyTool(): BaselineContextTool {
	return {
		async describe() {
			return toolDefinition;
		},
		async retrieve() {
			return {
				status: "ready",
				queryId: "customer_products",
				queryVersion: "v1",
				rows: [{ product_id: "product-1", product_status: "active" }],
				rowCount: 1,
				bytesProcessed: 100,
				durationMs: 5,
				reasonCode: null,
			};
		},
	};
}

function failedTool(): BaselineContextTool {
	return {
		async describe() {
			return toolDefinition;
		},
		async retrieve() {
			return {
				status: "failed",
				queryId: null,
				queryVersion: null,
				rows: [],
				rowCount: 0,
				bytesProcessed: null,
				durationMs: null,
				reasonCode: "baseline_query_plan_unknown",
			};
		},
	};
}

function toolTurn(callId: string) {
	return {
		kind: "tool_call" as const,
		call: {
			name: baselineRetrievalToolName,
			args: { queryId: "customer_products", version: "v1", parameters: {} },
			callId,
		},
	};
}

function counterClock(): () => number {
	let now = 100;
	return () => now++;
}
