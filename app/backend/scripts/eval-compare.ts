#!/usr/bin/env bun
/**
 * Local A/B compare: baseline vs control plane. Writes sanitized JSONL under
 * .local/eval-ab/. No BigQuery, no Langfuse, no AGENTIC_CHAT HTTP flag.
 */
import { join } from "node:path";
import {
	controlledTechnicalFailed,
	runAbComparison,
} from "../src/services/evaluation/ab-comparison.js";
import { selectAbScenarios } from "../tests/fixtures/ab-evaluation-scenarios.js";

function usage(): never {
	console.error(
		"usage: bun scripts/eval-compare.ts [--phase phase-1|phase-2|all] [--out .local/eval-ab]",
	);
	process.exit(2);
}

function parseArgs(argv: string[]) {
	let phase: "phase-1" | "phase-2" | "all" = "all";
	let out = join(process.cwd(), ".local", "eval-ab");
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
		} else if (arg === "--help" || arg === "-h") usage();
		else usage();
	}
	return { phase, out };
}

async function main(): Promise<number> {
	const { phase, out } = parseArgs(process.argv.slice(2));
	const scenarios = selectAbScenarios(phase);
	const day = new Date().toISOString().slice(0, 10).replaceAll("-", "");
	const runId = `ab-${day}-${crypto.randomUUID().slice(0, 8)}`;
	const { summary, metrics } = await runAbComparison({
		scenarios,
		outRoot: out,
		runId,
	});
	const payload = {
		ok: !controlledTechnicalFailed(metrics),
		...summary,
		phase,
		wording: "local A/B baseline vs controlled (file sink)",
		note: "semantic judge skipped; prompts not printed",
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
