import { z } from "zod";
import type { Env } from "../../config/env.js";
import type {
	AbMetricResult,
	EvaluationScenario,
	PipelineRunRecord,
} from "./ab-contracts.js";

/**
 * Optional semantic completeness judge for A/B comparison.
 * Synthetic double skips scoring; JEV judge (integrations) scores sanitized
 * trajectories (ADR 0015: JEV-as-judge for bounded completeness).
 */
export interface TaskCompletionJudge {
	evaluate(input: {
		scenario: EvaluationScenario;
		record: PipelineRunRecord;
	}): Promise<AbMetricResult>;
}

export class SyntheticTaskCompletionJudge implements TaskCompletionJudge {
	async evaluate(input: {
		scenario: EvaluationScenario;
		record: PipelineRunRecord;
	}): Promise<AbMetricResult> {
		return {
			scenarioId: input.scenario.scenarioId,
			pipeline: input.record.pipeline,
			metric: "task_completion_semantic",
			passed: true,
			label: "skipped",
			reasonCode: "judge_not_configured",
			score: 0,
		};
	}
}

export type TaskCompletionJudgeMode = "auto" | "jev" | "synthetic";

export type JevJudgeSettings = Pick<
	Env,
	| "JEV_ENABLED"
	| "JEV_BASE_URL"
	| "JEV_API_KEY"
	| "JEV_MODEL"
	| "JEV_MIN_CONFIDENCE"
	| "JEV_TIMEOUT_MS"
>;

const jevJudgeEnvSchema = z.object({
	JEV_ENABLED: z.union([z.boolean(), z.stringbool()]).default(false),
	JEV_BASE_URL: z.string().default(""),
	JEV_API_KEY: z.string().default(""),
	JEV_MODEL: z.string().default(""),
	JEV_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.7),
	JEV_TIMEOUT_MS: z.coerce
		.number()
		.int()
		.positive()
		.max(60_000)
		.default(10_000),
});

/**
 * Reads only JEV_* from process.env so eval:compare does not require full
 * runtime validation (KV, Firestore, etc.).
 */
export function loadJevJudgeSettingsFromProcessEnv(
	source: NodeJS.ProcessEnv = process.env,
): JevJudgeSettings {
	return jevJudgeEnvSchema.parse({
		JEV_ENABLED: source.JEV_ENABLED,
		JEV_BASE_URL: source.JEV_BASE_URL,
		JEV_API_KEY: source.JEV_API_KEY,
		JEV_MODEL: source.JEV_MODEL,
		JEV_MIN_CONFIDENCE: source.JEV_MIN_CONFIDENCE,
		JEV_TIMEOUT_MS: source.JEV_TIMEOUT_MS,
	});
}
