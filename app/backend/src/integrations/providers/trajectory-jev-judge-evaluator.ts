import type {
	EvaluationContext,
	EvaluationResult,
	JudgeEvaluator,
} from "../../services/evaluation/contracts.js";
import {
	createTrajectoryJevAsJudge,
	type TrajectoryJevAsJudgeOptions,
} from "./trajectory-jev-as-judge.js";

/**
 * ADR 0015 JudgeEvaluator port backed by createTrajectoryJevAsJudge.
 * Maps metadata-only EvaluationContext trajectories; never content.
 * Not wired into the sync P0-48 runner yet.
 */
export class TrajectoryJevJudgeEvaluator implements JudgeEvaluator {
	private readonly judge: ReturnType<typeof createTrajectoryJevAsJudge>;

	constructor(options: TrajectoryJevAsJudgeOptions) {
		this.judge = createTrajectoryJevAsJudge(options);
	}

	async evaluate(
		context: EvaluationContext,
	): Promise<readonly EvaluationResult[]> {
		const hasError = Boolean(context.errorCode) || !context.guardrailPassed;
		const judged = await this.judge.evaluate({
			workflowLabel:
				context.pipeline === "baseline" ? "workflow_A" : "workflow_B",
			outputs: {
				steps: context.trajectory.map((s) => ({
					name: s.name,
					route: s.route,
				})),
				status: hasError ? "failed" : "completed",
				route: context.route,
				toolOutcome: context.retrievalInvoked ? "ready" : "none",
				hasError,
				hasQueryPlan: context.catalogLoaded,
				gates: {
					controlPlane: context.controlPlaneInvoked ?? true,
					privacy: context.privacyGateInvoked ?? false,
					guardrail: context.guardrailInvoked ?? false,
					policy: true,
				},
				retrievalAttempted: context.retrievalInvoked ?? false,
				retrievalSucceeded: (context.retrievalSuccessCount ?? 0) > 0,
			},
			referenceOutputs: {
				steps: context.expectedTrajectory.map((s) => ({
					name: s.name,
					route: s.route,
				})),
				status: "completed",
				route: context.expectedRoute,
				toolOutcome: "ready",
				hasError: false,
				hasQueryPlan: true,
				gates: {
					controlPlane: true,
					privacy: false,
					guardrail: false,
					policy: true,
				},
				retrievalAttempted: true,
				retrievalSucceeded: true,
			},
		});

		return [
			{
				metric: "trajectory_complete_jev",
				score: judged.score,
				passed: judged.passed,
				label: judged.label === "pass" ? "pass" : "fail",
				reasonCode: judged.reasonCode,
				evaluator: "trajectory_jev_as_judge",
				evaluatorVersion: "v1",
				mode: "jev",
			},
		];
	}
}
