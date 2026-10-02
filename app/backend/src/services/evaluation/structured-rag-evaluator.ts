import { BaseAgentEvaluator } from "./base-agent-evaluator.js";
import type { Evaluation, EvaluationRun } from "./contracts.js";

/** Overrides the baseline with closed-catalog Structured RAG invariants. */
export class StructuredRagEvaluator extends BaseAgentEvaluator {
	override evaluate(run: EvaluationRun): readonly Evaluation[] {
		const base = super.evaluate(run);
		if (run.route !== "structured_rag") return base;
		const passed = run.catalogLoaded && run.evidenceVersion !== null;
		return [
			...base,
			{
				metric: "structured_catalog_and_evidence",
				score: passed ? 1 : 0,
				passed,
				...(passed
					? {}
					: { reason: "closed query catalog or evidence version missing" }),
			},
		];
	}
}
