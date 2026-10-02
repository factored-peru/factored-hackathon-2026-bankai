import { BaseAgentEvaluator } from "./base-agent-evaluator.js";
import type { Evaluation, EvaluationRun } from "./contracts.js";

/** Overrides the baseline with KG catalog-before-JEV invariants. */
export class KnowledgeGraphRagEvaluator extends BaseAgentEvaluator {
	override evaluate(run: EvaluationRun): readonly Evaluation[] {
		const base = super.evaluate(run);
		if (run.route !== "kg_rag") return base;
		const passed = run.catalogLoaded && run.evidenceVersion !== null;
		return [
			...base,
			{
				metric: "kg_catalog_and_evidence",
				score: passed ? 1 : 0,
				passed,
				...(passed
					? {}
					: {
							reason:
								"KG catalog was not loaded before the specialized Jev gate",
						}),
			},
		];
	}
}
