import type { AbMetricResult } from "./ab-contracts.js";

/**
 * Optional semantic completeness judge. P0 ships only a synthetic double that
 * never scores answer quality (ADR 0015: judge_not_configured).
 */
export interface TaskCompletionJudge {
	evaluate(input: {
		scenarioId: string;
		pipeline: "baseline" | "controlled";
	}): Promise<AbMetricResult>;
}

export class SyntheticTaskCompletionJudge implements TaskCompletionJudge {
	async evaluate(input: {
		scenarioId: string;
		pipeline: "baseline" | "controlled";
	}): Promise<AbMetricResult> {
		return {
			scenarioId: input.scenarioId,
			pipeline: input.pipeline,
			metric: "task_completion_semantic",
			passed: true,
			label: "skipped",
			reasonCode: "judge_not_configured",
			score: 0,
		};
	}
}
