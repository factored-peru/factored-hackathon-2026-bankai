export type EvaluationRoute = "llm" | "structured_rag" | "kg_rag" | "ood";

export type EvaluationRun = Readonly<{
	traceId: string;
	route: EvaluationRoute;
	policyAllowed: boolean;
	budgetExceeded: boolean;
	evidenceVersion: string | null;
	catalogLoaded: boolean;
	responseContainsSensitiveContent: boolean;
}>;

export type Evaluation = Readonly<{
	metric: string;
	score: number;
	passed: boolean;
	reason?: string;
}>;

export interface Evaluator {
	evaluate(run: EvaluationRun): readonly Evaluation[];
}
