#!/usr/bin/env bun
/**
 * Local A/B compare: baseline vs control plane. Writes sanitized JSONL under
 * .local/eval-ab/. No BigQuery, no Langfuse, no AGENTIC_CHAT HTTP flag.
 * Optional JEV-as-judge when JEV_* is enabled (--judge auto|jev|synthetic).
 * Baseline uses live Vertex when VERTEX_AI_ENABLED (--baseline auto|vertex|synthetic).
 */
import { join } from "node:path";
import { ControlledComparableRunner } from "../src/integrations/evaluation/controlled-comparable-runner.js";
import { createTaskCompletionJudgeFromEnv } from "../src/integrations/providers/jev-task-completion-judge.js";
import {
	type BaselineModelMode,
	createBaselineChatModelFromEnv,
	loadVertexBaselineSettingsFromProcessEnv,
} from "../src/integrations/providers/vertex-baseline-chat-provider.js";
import {
	controlledTechnicalFailed,
	runAbComparison,
} from "../src/services/evaluation/ab-comparison.js";
import { BaselineComparableRunner } from "../src/services/evaluation/baseline-comparable-runner.js";
import {
	loadJevJudgeSettingsFromProcessEnv,
	type TaskCompletionJudgeMode,
} from "../src/services/evaluation/task-completion-judge.js";
import { selectAbScenarios } from "../tests/fixtures/ab-evaluation-scenarios.js";

function usage(): never {
	console.error(
		"usage: bun scripts/eval-compare.ts [--phase phase-1|phase-2|all] [--out .local/eval-ab] [--judge auto|jev|synthetic] [--baseline auto|vertex|synthetic]",
	);
	process.exit(2);
}

function parseArgs(argv: string[]) {
	let phase: "phase-1" | "phase-2" | "all" = "all";
	let out = join(process.cwd(), ".local", "eval-ab");
	let judge: TaskCompletionJudgeMode = "auto";
	let baselineMode: BaselineModelMode = "auto";
	for (let i = 0; i < argv.length; i += 1) {
		const arg = argv[i];
		if (arg === "--phase") {
			const value = argv[++i];
			if (value !== "phase-1" && value !== "phase-2" && value !== "all")
				usage();
			phase = value;
		} else if (arg === "--out") {
			const value = argv[++i];
			if (!value) usage();
			out = value;
		} else if (arg === "--judge") {
			const value = argv[++i];
			if (value !== "auto" && value !== "jev" && value !== "synthetic") usage();
			judge = value;
		} else if (arg === "--baseline") {
			const value = argv[++i];
			if (value !== "auto" && value !== "vertex" && value !== "synthetic")
				usage();
			baselineMode = value;
		} else if (arg === "--help" || arg === "-h") usage();
		else usage();
	}
	return { phase, out, judge, baselineMode };
}

async function main(): Promise<number> {
	const {
		phase,
		out,
		judge: judgeMode,
		baselineMode,
	} = parseArgs(process.argv.slice(2));
	const settings = loadJevJudgeSettingsFromProcessEnv();
	const judge = createTaskCompletionJudgeFromEnv(settings, judgeMode);
	const vertex = loadVertexBaselineSettingsFromProcessEnv();
	const liveBaseline = createBaselineChatModelFromEnv(vertex, baselineMode);
	const baseline = liveBaseline
		? new BaselineComparableRunner({
				model: liveBaseline.model,
				modelId: liveBaseline.modelId,
			})
		: new BaselineComparableRunner();
	const scenarios = selectAbScenarios(phase);
	const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
	const runId = `ab-${day}-${crypto.randomUUID().slice(0, 8)}`;
	const { summary, metrics } = await runAbComparison({
		scenarios,
		outRoot: out,
		runId,
		judge,
		baseline,
		controlled: new ControlledComparableRunner(),
	});
	const jevActive = summary.judgeJevCount > 0;
	const baselineNote = liveBaseline
		? `baseline=${liveBaseline.modelId} (live Vertex; system prompt applied)`
		: "baseline=synthetic-double (no Vertex LLM)";
	const payload = {
		ok: !controlledTechnicalFailed(metrics),
		...summary,
		phase,
		judgeMode,
		baselineMode: liveBaseline ? "vertex" : "synthetic",
		wording: "local A/B baseline vs controlled (file sink)",
		note: [
			baselineNote,
			jevActive
				? "JEV-as-judge scored sanitized trajectories; prompts not printed"
				: "semantic judge skipped; prompts not printed",
		].join("; "),
	};
	process.stdout.write(`${JSON.stringify(payload)}\n`);
	return payload.ok ? 0 : 1;
}

main()
	.then((code) => {
		process.exitCode = code;
	})
	.catch((error: unknown) => {
		const message = error instanceof Error ? error.message : String(error);
		console.error(JSON.stringify({ ok: false, error: message }));
		process.exitCode = 1;
	});
