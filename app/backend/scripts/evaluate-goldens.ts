import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import { EvaluationRunner } from "../src/services/evaluation/evaluation-runner.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";
import { evaluationGoldens } from "../tests/fixtures/evaluation-goldens.js";
import { knowledgeGraphQuestionGoldens } from "../tests/fixtures/kg-question-goldens.js";

/**
 * Runs the deterministic, content-free P0 evaluation matrix. The resulting
 * payload intentionally excludes trace IDs, prompts, answers, tool arguments,
 * retrieved rows and evidence text so it can later flow to an OTel/BigQuery
 * adapter without widening ADR 0012's telemetry boundary.
 */
export function runEvaluationGoldenSet() {
	const runner = new EvaluationRunner(new BaseAgentEvaluator(), [
		new StructuredRagEvaluator(),
		new KnowledgeGraphRagEvaluator(),
	]);
	const reports = evaluationGoldens.map((fixture) => runner.run(fixture));
	const results = reports.flatMap((report) => report.results);
	return {
		matrixVersion: "p0-v1",
		gate: "informational" as const,
		baseFixtureCount: 48,
		additionalKgCaseFixtureCount: knowledgeGraphQuestionGoldens.length,
		fixtureCount: reports.length,
		resultCount: results.length,
		passedCount: results.filter((result) => result.passed).length,
		failedCount: results.filter((result) => !result.passed).length,
		reports,
	};
}

if (import.meta.main) {
	const batch = runEvaluationGoldenSet();
	const { reports: _reports, ...summary } = batch;
	const output = Bun.argv.includes("--reports") ? batch : summary;
	process.stdout.write(`${JSON.stringify(output)}\n`);
}
