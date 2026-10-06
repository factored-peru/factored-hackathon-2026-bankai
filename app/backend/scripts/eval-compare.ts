#!/usr/bin/env bun
/**
 * Local A/B compare: baseline vs control plane. Writes sanitized JSONL under
 * .local/eval-ab/. No BigQuery, no Langfuse, no AGENTIC_CHAT HTTP flag.
 * Optional JEV-as-judge when JEV_* is enabled (--judge auto|jev|synthetic).
 */
import { join } from "node:path";
import { ControlledComparableRunner } from "../src/integrations/evaluation/controlled-comparable-runner.js";
import { createTaskCompletionJudgeFromEnv } from "../src/integrations/providers/jev-task-completion-judge.js";
import {
	controlledTechnicalFailed,
	runAbComparison,
} from "../src/services/evaluation/ab-comparison.js";
import {
	loadJevJudgeSettingsFromProcessEnv,
	type TaskCompletionJudgeMode,
} from "../src/services/evaluation/task-completion-judge.js";
import { selectAbScenarios } from "../tests/fixtures/ab-evaluation-scenarios.js";

function usage(): never {
	console.error(
		"usage: bun scripts/eval-compare.ts [--phase phase-1|phase-2|all] [--out .local/eval-ab] [--judge auto|jev|synthetic]",
	);
	process.exit(2);
}

function parseArgs(argv: string[]) {
	let phase: "phase-1" | "phase-2" | "all" = "all";
	let out = join(process.cwd(), ".local", "eval-ab");
	let judge: TaskCompletionJudgeMode = "auto";
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
		} else if (arg === "--help" || arg === "-h") usage();
		else usage();
	}
	return { phase, out, judge };
}

async function main(): Promise<number> {
	const { phase, out, judge: judgeMode } = parseArgs(process.argv.slice(2));
	const settings = loadJevJudgeSettingsFromProcessEnv();
	const judge = createTaskCompletionJudgeFromEnv(settings, judgeMode);
	const scenarios = selectAbScenarios(phase);
	const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
	const runId = `ab-${day}-${crypto.randomUUID().slice(0, 8)}`;
	const { summary, metrics } = await runAbComparison({
		scenarios,
		outRoot: out,
		runId,
		judge,
		controlled: new ControlledComparableRunner(),
	});
	const jevActive = summary.judgeJevCount > 0;
	const payload = {
		ok: !controlledTechnicalFailed(metrics),
		...summary,
		phase,
		judgeMode,
		wording: "local A/B baseline vs controlled (file sink)",
		note: jevActive
			? "JEV-as-judge scored sanitized trajectories; prompts not printed"
			: "semantic judge skipped; prompts not printed",
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
