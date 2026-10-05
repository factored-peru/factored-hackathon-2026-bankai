import { appendFile, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
	type AbMetricResult,
	type PipelineRunRecord,
	parsePipelineRunRecord,
} from "./ab-contracts.js";

export type AbCompareSummary = Readonly<{
	runId: string;
	scenarioCount: number;
	baselineRuns: number;
	controlledRuns: number;
	technicalPassCount: number;
	technicalFailCount: number;
	judgeSkippedCount: number;
	outDir: string;
	gate: "informational";
	containsSourceValues: false;
}>;

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
