import { describe, expect, test } from "bun:test";
import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import { EvaluationRunner } from "../src/services/evaluation/evaluation-runner.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";
import { evaluationGoldens } from "./fixtures/evaluation-goldens.js";

const safeStructuredRun = {
	traceId: "trace-a",
	fixtureId: "safe-structured",
	route: "structured_rag" as const,
	expectedRoute: "structured_rag" as const,
	trajectory: [],
	expectedTrajectory: [],
	policyAllowed: true,
	budgetExceeded: false,
	evidenceVersion: "v1",
	catalogLoaded: true,
	catalogLoadedBeforeSpecializedJev: true,
	tenantIsolated: true,
	guardrailPassed: true,
	responseContainsSensitiveContent: false,
	resultVerified: true,
	policyVersion: "v1",
	catalogVersion: "v1",
};

describe("agent evaluators", () => {
	test("emits only deterministic sanitized baseline metrics", () => {
		const evaluations = new BaseAgentEvaluator().evaluate(safeStructuredRun);
		expect(evaluations).toHaveLength(8);
		expect(evaluations.every((evaluation) => evaluation.passed)).toBe(true);
		expect(
			evaluations.every(
				(evaluation) => evaluation.score >= 0 && evaluation.score <= 1,
			),
		).toBe(true);
	});

	test("adds a Structured RAG catalog/evidence override", () => {
		const evaluations = new StructuredRagEvaluator().evaluate(
			safeStructuredRun,
		);
		expect(evaluations).toEqual([
			expect.objectContaining({
				metric: "structured_catalog_and_evidence",
				label: "pass",
				passed: true,
			}),
		]);
	});

	test("requires a preloaded catalog for KG-RAG", () => {
		const evaluations = new KnowledgeGraphRagEvaluator().evaluate({
			...safeStructuredRun,
			route: "kg_rag",
			catalogLoaded: false,
		});
		expect(evaluations).toEqual([
			expect.objectContaining({
				metric: "kg_catalog_before_jev_and_evidence",
				passed: false,
			}),
		]);
	});

	test("keeps the complete synthetic golden set informational", () => {
		expect(evaluationGoldens).toHaveLength(48);
		const runner = new EvaluationRunner(new BaseAgentEvaluator(), [
			new StructuredRagEvaluator(),
			new KnowledgeGraphRagEvaluator(),
		]);
		for (const golden of evaluationGoldens) {
			const report = runner.run(golden);
			expect(report.gate).toBe("informational");
			expect(report.results.length).toBeGreaterThan(0);
			expect(
				report.results.filter((result) => result.evaluator === "base_agent"),
			).toHaveLength(8);
			expect(report.results).toHaveLength(
				golden.route === "structured_rag" || golden.route === "kg_rag" ? 9 : 8,
			);
			expect(
				report.results.every(
					(result) =>
						result.score >= 0 &&
						result.score <= 1 &&
						result.reasonCode !== undefined,
				),
			).toBe(true);
		}
	});
});
