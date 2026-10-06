import type {
	AbMetricResult,
	EvaluationScenario,
	PipelineRunRecord,
} from "../../services/evaluation/ab-contracts.js";
import { toSanitizedTrajectory } from "../../services/evaluation/sanitized-trajectory.js";
import type {
	JevJudgeSettings,
	TaskCompletionJudge,
	TaskCompletionJudgeMode,
} from "../../services/evaluation/task-completion-judge.js";
import { SyntheticTaskCompletionJudge } from "../../services/evaluation/task-completion-judge.js";
import {
	createTrajectoryJevAsJudge,
	judgeSanitizedTrajectory,
} from "./trajectory-jev-as-judge.js";

/** JEV-backed semantic judge; lives in integrations (uses TypeSafe client). */
export class JevTaskCompletionJudge implements TaskCompletionJudge {
	private readonly judge: ReturnType<typeof createTrajectoryJevAsJudge>;

	constructor(options: Parameters<typeof createTrajectoryJevAsJudge>[0]) {
		this.judge = createTrajectoryJevAsJudge(options);
	}

	async evaluate(input: {
		scenario: EvaluationScenario;
		record: PipelineRunRecord;
	}): Promise<AbMetricResult> {
		const projection = toSanitizedTrajectory(input.scenario, input.record);
		return judgeSanitizedTrajectory(this.judge, projection);
	}
}

export function createTaskCompletionJudgeFromEnv(
	settings: JevJudgeSettings,
	mode: TaskCompletionJudgeMode = "auto",
	overrides: { fetch?: typeof fetch } = {},
): TaskCompletionJudge {
	const wantJev = mode === "jev" || (mode === "auto" && settings.JEV_ENABLED);

	if (!wantJev) {
		return new SyntheticTaskCompletionJudge();
	}

	if (
		!settings.JEV_ENABLED ||
		settings.JEV_BASE_URL.length === 0 ||
		settings.JEV_API_KEY.length === 0 ||
		settings.JEV_MODEL.length === 0
	) {
		if (mode === "jev") {
			throw new Error("jev_judge_misconfigured");
		}
		return new SyntheticTaskCompletionJudge();
	}

	return new JevTaskCompletionJudge({
		baseUrl: settings.JEV_BASE_URL,
		apiKey: settings.JEV_API_KEY,
		model: settings.JEV_MODEL,
		minConfidence: settings.JEV_MIN_CONFIDENCE,
		timeoutMs: settings.JEV_TIMEOUT_MS,
		...(overrides.fetch === undefined ? {} : { fetch: overrides.fetch }),
	});
}
