import { z } from "zod";

export const controlledModeSchema = z.enum([
	"database_ok",
	"rag_ok",
	"llm_ok",
	"ood",
	"deny",
	"hitl",
	"guardrail_block",
	"clarify",
	"jev_unavailable",
	"jev_low_confidence",
	"rag_injection",
	"cross_tenant",
	"approval_replay",
	"session_rotated",
	"raw_pii",
	"final_guardrail",
]);
export type ControlledMode = z.infer<typeof controlledModeSchema>;

/** Prompt-bearing A/B scenario; never copied into PipelineRunRecord or telemetry. */
export const evaluationScenarioSchema = z
	.object({
		scenarioId: z.string().min(1),
		phase: z.enum(["phase-1", "phase-2"]),
		prompt: z.string().min(1),
		actorId: z.string().min(1),
		snapshotId: z.string().min(1),
		/** positive = legitimate catalog/safe handling; negative = abuse/deny/fail-closed. */
		polarity: z.enum(["positive", "negative"]),
		/** User-utterance locale (system/judge prompts stay English). */
		locale: z.enum(["es", "pt"]),
		expectedRoute: z.enum([
			"llm",
			"structured_rag",
			"kg_rag",
			"ood",
			"deny",
			"hitl",
			"clarify",
		]),
		expectedQueryPlanId: z.string().min(1).nullable(),
		expectedTerminalStatus: z.enum([
			"completed",
			"failed",
			"denied",
			"pending_approval",
			"pending_clarification",
		]),
		expectedRetrieval: z.boolean(),
		controlledMode: controlledModeSchema,
		/** Controlled must invoke these gates; baseline is measured separately. */
		controlledExpectsGates: z.object({
			controlPlane: z.boolean(),
			privacy: z.boolean(),
			guardrail: z.boolean(),
			policy: z.boolean(),
		}),
		researchRef: z.string().min(1).nullable(),
	})
	.strict();

export type EvaluationScenario = z.infer<typeof evaluationScenarioSchema>;

export const gatesInvokedSchema = z
	.object({
		controlPlane: z.boolean(),
		privacy: z.boolean(),
		guardrail: z.boolean(),
		policy: z.boolean(),
	})
	.strict();

/**
 * Sanitized A/B execution record. Forbidden keys (prompt, response, sql, rows,
 * sessionId, PII) are rejected by parsePipelineRunRecord.
 */
export const pipelineRunRecordSchema = z
	.object({
		runId: z.string().min(1),
		scenarioId: z.string().min(1),
		snapshotId: z.string().min(1),
		pipeline: z.enum(["baseline", "controlled"]),
		status: z.enum([
			"completed",
			"failed",
			"denied",
			"pending_approval",
			"pending_clarification",
		]),
		route: z.enum([
			"llm",
			"structured_rag",
			"kg_rag",
			"ood",
			"deny",
			"hitl",
			"clarify",
			"unknown",
		]),
		queryPlanId: z.string().min(1).nullable(),
		catalogVersion: z.string().min(1).nullable(),
		policyVersion: z.string().min(1).nullable(),
		modelVersion: z.string().min(1).nullable(),
		durationMs: z.number().nonnegative(),
		modelCallCount: z.number().int().nonnegative(),
		retrievalAttemptCount: z.number().int().nonnegative(),
		retrievalSuccessCount: z.number().int().nonnegative(),
		aggregatedRowCount: z.number().int().nonnegative(),
		aggregatedBytes: z.number().int().nonnegative(),
		toolOutcome: z.enum(["none", "ready", "failed", "denied", "skipped"]),
		errorCode: z.string().min(1).nullable(),
		gatesInvoked: gatesInvokedSchema,
	})
	.strict();

export type PipelineRunRecord = z.infer<typeof pipelineRunRecordSchema>;

const FORBIDDEN_RECORD_KEYS = [
	"prompt",
	"response",
	"message",
	"sql",
	"rows",
	"sessionId",
	"session_id",
	"customerId",
	"customer_id",
	"pii",
	"evidence",
	"arguments",
] as const;

export function assertNoForbiddenRunKeys(value: unknown): void {
	if (value === null || typeof value !== "object") return;
	for (const key of Object.keys(value as Record<string, unknown>)) {
		const lower = key.toLowerCase();
		if (
			FORBIDDEN_RECORD_KEYS.some(
				(forbidden) =>
					forbidden.toLowerCase() === lower || lower.includes("prompt"),
			)
		) {
			throw new Error(`pipeline_run_record_forbidden_key:${key}`);
		}
	}
}

export function parsePipelineRunRecord(value: unknown): PipelineRunRecord {
	assertNoForbiddenRunKeys(value);
	return pipelineRunRecordSchema.parse(value);
}

export type ComparablePipelineRunner = {
	readonly pipeline: "baseline" | "controlled";
	run(scenario: EvaluationScenario): Promise<PipelineRunRecord>;
};

export type AbMetricResult = Readonly<{
	scenarioId: string;
	pipeline: "baseline" | "controlled";
	metric: string;
	passed: boolean;
	label: "pass" | "fail" | "skipped";
	reasonCode: string | null;
	score: number;
}>;
