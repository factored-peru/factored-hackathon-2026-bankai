import type {
	EvaluationContext,
	EvaluationResult,
	RouteEvaluator,
} from "./contracts.js";

/** Adds closed-catalog Structured RAG invariants after the shared baseline. */
export class StructuredRagEvaluator implements RouteEvaluator {
	readonly route = "structured_rag" as const;
	readonly name = "structured_rag";
	readonly version = "v1";

	evaluate(context: EvaluationContext): readonly EvaluationResult[] {
		const passed = context.catalogLoaded && context.evidenceVersion !== null;
		return [
			{
				metric: "structured_catalog_and_evidence",
				score: passed ? 1 : 0,
				passed,
				label: passed ? "pass" : "fail",
				reasonCode: passed ? null : "structured_catalog_or_evidence_missing",
				evaluator: this.name,
				evaluatorVersion: this.version,
				mode: "deterministic",
			},
		];
	}
}
