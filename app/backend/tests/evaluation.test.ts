import { describe, expect, test } from "bun:test";
import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";

const safeStructuredRun = {
	traceId: "trace-a",
	route: "structured_rag" as const,
	policyAllowed: true,
	budgetExceeded: false,
	evidenceVersion: "v1",
	catalogLoaded: true,
	responseContainsSensitiveContent: false,
};

describe("agent evaluators", () => {
	test("emits only deterministic sanitized baseline metrics", () => {
		const evaluations = new BaseAgentEvaluator().evaluate(safeStructuredRun);
		expect(evaluations).toHaveLength(3);
		expect(evaluations.every((evaluation) => evaluation.passed)).toBe(true);
	});

	test("adds a Structured RAG catalog/evidence override", () => {
		const evaluations = new StructuredRagEvaluator().evaluate(
			safeStructuredRun,
		);
		expect(evaluations.at(-1)).toMatchObject({
			metric: "structured_catalog_and_evidence",
			passed: true,
		});
	});

	test("requires a preloaded catalog for KG-RAG", () => {
		const evaluations = new KnowledgeGraphRagEvaluator().evaluate({
			...safeStructuredRun,
			route: "kg_rag",
			catalogLoaded: false,
		});
		expect(evaluations.at(-1)).toMatchObject({
			metric: "kg_catalog_and_evidence",
			passed: false,
		});
	});
});
