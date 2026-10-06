import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type AbMetricResult,
	type EvaluationScenario,
	type PipelineRunRecord,
	parsePipelineRunRecord,
} from "./ab-contracts.js";

export type WorkflowSemanticSummary = Readonly<{
	avgScore: number;
	passCount: number;
	failCount: number;
	passRate: number;
}>;

export type PairedSemanticSummary = Readonly<{
	workflow_A: WorkflowSemanticSummary;
	workflow_B: WorkflowSemanticSummary;
	pairsWhere_B_higher: number;
	pairsWhere_A_higher: number;
	pairsTied: number;
	avgDelta_B_minus_A: number;
}>;

export type AbCompareSummary = Readonly<{
	runId: string;
	scenarioCount: number;
	baselineRuns: number;
	controlledRuns: number;
	technicalPassCount: number;
	technicalFailCount: number;
	judgeSkippedCount: number;
	judgeJevCount: number;
	/** Opaque A/B labels (workflow_A = baseline runner, workflow_B = controlled). */
	semantic:
		| (PairedSemanticSummary & {
				byPolarity: Readonly<{
					positive: PairedSemanticSummary;
					negative: PairedSemanticSummary;
				}>;
		  })
		| null;
	outDir: string;
	gate: "informational";
	containsSourceValues: false;
}>;

function emptyWorkflowSemantic(): WorkflowSemanticSummary {
	return { avgScore: 0, passCount: 0, failCount: 0, passRate: 0 };
}

function emptyPaired(): PairedSemanticSummary {
	return {
		workflow_A: emptyWorkflowSemantic(),
		workflow_B: emptyWorkflowSemantic(),
		pairsWhere_B_higher: 0,
		pairsWhere_A_higher: 0,
		pairsTied: 0,
		avgDelta_B_minus_A: 0,
	};
}

function summarizeRows(
	rows: readonly AbMetricResult[],
): WorkflowSemanticSummary {
	if (rows.length === 0) return emptyWorkflowSemantic();
	const passCount = rows.filter((m) => m.passed).length;
	const failCount = rows.length - passCount;
	const avgScore = rows.reduce((sum, m) => sum + m.score, 0) / rows.length;
	return {
		avgScore: Number(avgScore.toFixed(3)),
		passCount,
		failCount,
		passRate: Number((passCount / rows.length).toFixed(3)),
	};
}

function pairSummary(scored: readonly AbMetricResult[]): PairedSemanticSummary {
	if (scored.length === 0) return emptyPaired();
	const aRows = scored.filter((m) => m.pipeline === "baseline");
	const bRows = scored.filter((m) => m.pipeline === "controlled");
	const ids = [...new Set(scored.map((m) => m.scenarioId))];
	let pairsWhere_B_higher = 0;
	let pairsWhere_A_higher = 0;
	let pairsTied = 0;
	let deltaSum = 0;
	let pairCount = 0;
	for (const id of ids) {
		const a = aRows.find((m) => m.scenarioId === id);
		const b = bRows.find((m) => m.scenarioId === id);
		if (!a || !b) continue;
		const delta = b.score - a.score;
		deltaSum += delta;
		pairCount += 1;
		if (delta > 0.001) pairsWhere_B_higher += 1;
		else if (delta < -0.001) pairsWhere_A_higher += 1;
		else pairsTied += 1;
	}
	return {
		workflow_A: summarizeRows(aRows),
		workflow_B: summarizeRows(bRows),
		pairsWhere_B_higher,
		pairsWhere_A_higher,
		pairsTied,
		avgDelta_B_minus_A:
			pairCount === 0 ? 0 : Number((deltaSum / pairCount).toFixed(3)),
	};
}

export function buildSemanticSummary(
	semantic: readonly AbMetricResult[],
	scenarios: readonly EvaluationScenario[] = [],
): AbCompareSummary["semantic"] {
	const scored = semantic.filter(
		(m) => m.reasonCode !== "judge_not_configured",
	);
	if (scored.length === 0) return null;

	const polarityById = new Map(
		scenarios.map((s) => [s.scenarioId, s.polarity] as const),
	);
	const forPolarity = (polarity: "positive" | "negative") =>
		scored.filter((m) => polarityById.get(m.scenarioId) === polarity);

	const overall = pairSummary(scored);
	return {
		...overall,
		byPolarity: {
			positive: pairSummary(forPolarity("positive")),
			negative: pairSummary(forPolarity("negative")),
		},
	};
}

export class FileEvaluationReportSink {
	constructor(private readonly rootDir: string) {}

	async begin(runId: string): Promise<string> {
		const outDir = join(this.rootDir, runId);
		await mkdir(outDir, { recursive: true });
		return outDir;
	}

	async writeRun(outDir: string, record: PipelineRunRecord): Promise<void> {
		const sanitized = parsePipelineRunRecord(record);
		await appendFile(
			join(outDir, "runs.jsonl"),
			`${JSON.stringify(sanitized)}\n`,
			"utf8",
		);
	}

	async writeMetric(outDir: string, metric: AbMetricResult): Promise<void> {
		await appendFile(
			join(outDir, "metrics.jsonl"),
			`${JSON.stringify(metric)}\n`,
			"utf8",
		);
	}

	async writeSummary(outDir: string, summary: AbCompareSummary): Promise<void> {
		await writeFile(
			join(outDir, "summary.json"),
			`${JSON.stringify(summary, null, 2)}\n`,
			"utf8",
		);
	}
}
