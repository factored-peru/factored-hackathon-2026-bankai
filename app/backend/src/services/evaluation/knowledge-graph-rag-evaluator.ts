import type {
	EvaluationContext,
	EvaluationResult,
	RouteEvaluator,
} from "./contracts.js";

/** Adds KG catalog-before-JEV invariants after the shared baseline. */
export class KnowledgeGraphRagEvaluator implements RouteEvaluator {
	readonly route = "kg_rag" as const;
	readonly name = "knowledge_graph_rag";
	readonly version = "v1";

	evaluate(context: EvaluationContext): readonly EvaluationResult[] {
		const passed =
			context.catalogLoaded &&
			context.catalogLoadedBeforeSpecializedJev &&
			context.evidenceVersion !== null;
		const results: EvaluationResult[] = [
			{
				metric: "kg_catalog_before_jev_and_evidence",
				score: passed ? 1 : 0,
				passed,
				label: passed ? "pass" : "fail",
				reasonCode: passed ? null : "kg_catalog_or_evidence_missing",
				evaluator: this.name,
				evaluatorVersion: this.version,
				mode: "deterministic",
			},
		];
		if (context.kgSelectionMatchesFixture !== undefined) {
			const matches = context.kgSelectionMatchesFixture;
			results.push({
				metric: "kg_fixture_selection_matches",
				score: matches ? 1 : 0,
				passed: matches,
				label: matches ? "pass" : "fail",
				reasonCode: matches ? null : "kg_fixture_selection_mismatch",
				evaluator: this.name,
				evaluatorVersion: this.version,
				mode: "deterministic",
			});
		}
		return results;
	}
}
