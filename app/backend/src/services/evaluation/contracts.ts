export type EvaluationRoute = "llm" | "structured_rag" | "kg_rag" | "ood";
export type EvaluationMode = "deterministic" | "jev" | "llm";

export type EvaluationStep = Readonly<{
	name: string;
	route: EvaluationRoute | "clarify" | "hitl" | "policy";
}>;

/** Metadata-only evaluation input. Content and PII stay outside this boundary. */
export type EvaluationContext = Readonly<{
	traceId: string;
	fixtureId: string;
	route: EvaluationRoute;
	expectedRoute: EvaluationRoute;
	trajectory: readonly EvaluationStep[];
	expectedTrajectory: readonly EvaluationStep[];
	policyAllowed: boolean;
	budgetExceeded: boolean;
	evidenceVersion: string | null;
	catalogLoaded: boolean;
	catalogLoadedBeforeSpecializedJev: boolean;
	tenantIsolated: boolean;
	guardrailPassed: boolean;
	responseContainsSensitiveContent: boolean;
	resultVerified: boolean;
	policyVersion: string;
	catalogVersion: string | null;
}>;

export type EvaluationResult = Readonly<{
	metric: string;
	score: number;
	passed: boolean;
	label: "pass" | "fail" | "skipped";
	reasonCode: string | null;
	evaluator: string;
	evaluatorVersion: string;
	mode: EvaluationMode;
}>;

export type EvaluationReport = Readonly<{
	fixtureId: string;
	gate: "informational";
	results: readonly EvaluationResult[];
}>;

export interface Evaluator {
	evaluate(context: EvaluationContext): readonly EvaluationResult[];
}

/** Evaluator that applies only to one resolved control-plane route. */
export interface RouteEvaluator extends Evaluator {
	readonly route: EvaluationRoute;
}

/** Optional boundary for JEV or LLM judges; no provider is wired in P0. */
export interface JudgeEvaluator {
	evaluate(context: EvaluationContext): Promise<readonly EvaluationResult[]>;
}
