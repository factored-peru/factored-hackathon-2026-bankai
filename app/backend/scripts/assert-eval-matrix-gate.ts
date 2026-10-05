#!/usr/bin/env bun
import { evaluationGoldens } from "../tests/fixtures/evaluation-goldens.js";
import { knowledgeGraphQuestionGoldens } from "../tests/fixtures/kg-question-goldens.js";
/**
 * CI contract gate for the P0 evaluation matrix (ADR 0015).
 * Asserts 48 core + 5 KG C1–C5 fixture counts. Does not fail on informational
 * metric scores — only on broken matrix contract / missing KG case ids.
 */
import { runEvaluationGoldenSet } from "./evaluate-goldens.js";

const REQUIRED_KG_CASE_IDS = [
	"kg-case-c1-sla-scope",
	"kg-case-c2-resolution-scope",
	"kg-case-c3-fraud-signal-scope",
	"kg-case-c4-followup-scope",
	"kg-case-c5-satisfaction-scope",
] as const;

function fail(message: string): never {
	console.error(JSON.stringify({ ok: false, error: message }));
	process.exit(1);
}

const batch = runEvaluationGoldenSet();
const { reports: _reports, ...summary } = batch;
const payload = JSON.stringify(summary);

if (summary.matrixVersion !== "p0-v1") {
	fail(`expected matrixVersion p0-v1, got ${summary.matrixVersion}`);
}
if (summary.gate !== "informational") {
	fail(`expected gate informational, got ${summary.gate}`);
}
if (summary.baseFixtureCount !== 48) {
	fail(`expected baseFixtureCount 48, got ${summary.baseFixtureCount}`);
}
if (summary.additionalKgCaseFixtureCount !== 5) {
	fail(
		`expected additionalKgCaseFixtureCount 5, got ${summary.additionalKgCaseFixtureCount}`,
	);
}
if (summary.fixtureCount !== 53) {
	fail(`expected fixtureCount 53, got ${summary.fixtureCount}`);
}
if (evaluationGoldens.length !== 53) {
	fail(`expected evaluationGoldens length 53, got ${evaluationGoldens.length}`);
}
if (evaluationGoldens.length - knowledgeGraphQuestionGoldens.length !== 48) {
	fail("expected evaluationGoldens length minus KG cases to equal 48");
}
if (knowledgeGraphQuestionGoldens.length !== 5) {
	fail(
		`expected 5 KG question goldens, got ${knowledgeGraphQuestionGoldens.length}`,
	);
}

const goldenIds = new Set(evaluationGoldens.map((g) => g.fixtureId));
const kgIds = knowledgeGraphQuestionGoldens.map((g) => g.fixtureId);
for (const id of REQUIRED_KG_CASE_IDS) {
	if (!goldenIds.has(id)) fail(`missing evaluation golden fixtureId ${id}`);
	if (!kgIds.includes(id)) fail(`missing kg-question golden fixtureId ${id}`);
}

if (payload.includes("¿") || payload.includes("synthetic-")) {
	fail(
		"summary must remain content-free (no question text or synthetic- traces)",
	);
}

console.log(
	JSON.stringify({
		ok: true,
		matrixVersion: summary.matrixVersion,
		gate: summary.gate,
		baseFixtureCount: summary.baseFixtureCount,
		additionalKgCaseFixtureCount: summary.additionalKgCaseFixtureCount,
		fixtureCount: summary.fixtureCount,
		wording: "48 core + 5 extensiones KG C1–C5",
		failedCount: summary.failedCount,
		passedCount: summary.passedCount,
		note: "informational metric failures do not fail this gate",
	}),
);
