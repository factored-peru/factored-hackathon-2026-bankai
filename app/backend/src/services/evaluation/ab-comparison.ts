import type {
	AbMetricResult,
	ComparablePipelineRunner,
	EvaluationScenario,
	PipelineRunRecord,
} from "./ab-contracts.js";
import { BaselineComparableRunner } from "./baseline-comparable-runner.js";
import {
	type AbCompareSummary,
	buildSemanticSummary,
	FileEvaluationReportSink,
} from "./file-evaluation-report-sink.js";
import {
	SyntheticTaskCompletionJudge,
	type TaskCompletionJudge,
} from "./task-completion-judge.js";

export function evaluateTechnicalCompleteness(
	scenario: EvaluationScenario,
	record: PipelineRunRecord,
): AbMetricResult[] {
	const metrics: AbMetricResult[] = [];
	const push = (metric: string, passed: boolean, reasonCode: string | null) => {
		metrics.push({
			scenarioId: scenario.scenarioId,
			pipeline: record.pipeline,
			metric,
			passed,
			label: passed ? "pass" : "fail",
			reasonCode: passed ? null : reasonCode,
			score: passed ? 1 : 0,
		});
	};

	if (record.pipeline === "controlled") {
		push(
			"terminal_status_matches",
			record.status === scenario.expectedTerminalStatus,
			"terminal_status_mismatch",
		);
		push(
			"route_matches",
			record.route === scenario.expectedRoute,
			"route_mismatch",
		);
		push(
			"control_plane_invoked",
			record.gatesInvoked.controlPlane ===
				scenario.controlledExpectsGates.controlPlane,
			"control_plane_gate_mismatch",
		);
		push(
			"policy_gate_invoked",
			record.gatesInvoked.policy === scenario.controlledExpectsGates.policy,
			"policy_gate_mismatch",
		);
		if (scenario.expectedQueryPlanId) {
			push(
				"query_plan_matches",
				record.queryPlanId === scenario.expectedQueryPlanId,
				"query_plan_mismatch",
			);
		}
		if (scenario.expectedRetrieval) {
			push(
				"retrieval_succeeded",
				record.retrievalSuccessCount > 0,
				"retrieval_expected_missing",
			);
		}
	} else {
		// Baseline: ungated shape is comparative evidence, not a fail criterion.
		push(
			"baseline_ungated_shape",
			!record.gatesInvoked.controlPlane &&
				!record.gatesInvoked.privacy &&
				!record.gatesInvoked.guardrail &&
				!record.gatesInvoked.policy,
			"baseline_unexpected_gates",
		);
		if (scenario.expectedRetrieval && scenario.expectedQueryPlanId) {
			push(
				"baseline_retrieval_attempted",
				record.retrievalAttemptCount > 0,
				"baseline_retrieval_missing",
			);
			push(
				"baseline_query_plan_recorded",
				record.queryPlanId === scenario.expectedQueryPlanId,
				"baseline_query_plan_mismatch",
			);
		}
	}

	push(
		"same_snapshot",
		record.snapshotId === scenario.snapshotId,
		"snapshot_drift",
	);
	return metrics;
}

export type AbCompareOptions = Readonly<{
	scenarios: readonly EvaluationScenario[];
	outRoot: string;
	runId: string;
	judge?: TaskCompletionJudge;
	/** Controlled pipeline composition root (integrations). */
	controlled: ComparablePipelineRunner;
}>;

export type AbCompareResult = Readonly<{
	summary: AbCompareSummary;
	runs: readonly PipelineRunRecord[];
	metrics: readonly AbMetricResult[];
}>;

export async function runAbComparison(
	options: AbCompareOptions,
): Promise<AbCompareResult> {
	const baseline = new BaselineComparableRunner();
	const controlled = options.controlled;
	const judge = options.judge ?? new SyntheticTaskCompletionJudge();
	const sink = new FileEvaluationReportSink(options.outRoot);
	const outDir = await sink.begin(options.runId);

	const runs: PipelineRunRecord[] = [];
	const metrics: AbMetricResult[] = [];

	for (const scenario of options.scenarios) {
		const baselineRun = await baseline.run(scenario);
		const controlledRun = await controlled.run(scenario);
		if (baselineRun.snapshotId !== controlledRun.snapshotId) {
			throw new Error("ab_snapshot_mismatch");
		}
		runs.push(baselineRun, controlledRun);
		await sink.writeRun(outDir, baselineRun);
		await sink.writeRun(outDir, controlledRun);

		const technical = [
			...evaluateTechnicalCompleteness(scenario, baselineRun),
			...evaluateTechnicalCompleteness(scenario, controlledRun),
		];
		for (const metric of technical) {
			metrics.push(metric);
			await sink.writeMetric(outDir, metric);
		}
		for (const record of [baselineRun, controlledRun]) {
			const judged = await judge.evaluate({
				scenario,
				record,
			});
			metrics.push(judged);
			await sink.writeMetric(outDir, judged);
		}
	}

	const technicalOnly = metrics.filter(
		(m) => m.metric !== "task_completion_semantic",
	);
	const semantic = metrics.filter(
		(m) => m.metric === "task_completion_semantic",
	);
	const summary: AbCompareSummary = {
		runId: options.runId,
		scenarioCount: options.scenarios.length,
		baselineRuns: runs.filter((r) => r.pipeline === "baseline").length,
		controlledRuns: runs.filter((r) => r.pipeline === "controlled").length,
		technicalPassCount: technicalOnly.filter((m) => m.passed).length,
		technicalFailCount: technicalOnly.filter((m) => !m.passed).length,
		judgeSkippedCount: semantic.filter(
			(m) => m.reasonCode === "judge_not_configured",
		).length,
		judgeJevCount: semantic.filter(
			(m) => m.reasonCode !== "judge_not_configured",
		).length,
		semantic: buildSemanticSummary(semantic, options.scenarios),
		outDir,
		gate: "informational",
		containsSourceValues: false,
	};
	await sink.writeSummary(outDir, summary);
	return { summary, runs, metrics };
}

export function controlledTechnicalFailed(
	metrics: readonly AbMetricResult[],
): boolean {
	return metrics.some(
		(m) =>
			m.pipeline === "controlled" &&
			m.metric !== "task_completion_semantic" &&
			m.label === "fail" &&
			!m.passed,
	);
}
