import type { KnowledgeGraphSelection } from "../../src/services/retrieval/knowledge-graph-selection.js";

type SelectedOperation = Extract<
	KnowledgeGraphSelection,
	{ decision: "select" }
>;

/**
 * Synthetic, aggregate-only questions used to exercise the KG route.
 * The question text is test input only: it must never cross into evaluation
 * telemetry, EvaluationContext, artifacts, or production catalogs.
 */
export type KnowledgeGraphQuestionGolden = Readonly<{
	fixtureId: string;
	question: string;
	expectedSelection: SelectedOperation;
	expectedTarget: string;
	expectedStatus: "exploratory_not_promoted";
}>;

function caseSummary(caseId: string): SelectedOperation {
	return {
		decision: "select",
		operationId: "kg.case.summary",
		version: "v1",
		parameters: { case_id: caseId },
	};
}

export const knowledgeGraphQuestionGoldens: readonly KnowledgeGraphQuestionGolden[] =
	[
		{
			fixtureId: "kg-case-c1-sla-scope",
			question:
				"¿Cuál es el alcance exploratorio del caso C1 de incumplimiento de SLA y qué limitación impide priorizar automáticamente?",
			expectedSelection: caseSummary("C1"),
			expectedTarget: "sla_breached",
			expectedStatus: "exploratory_not_promoted",
		},
		{
			fixtureId: "kg-case-c2-resolution-scope",
			question:
				"¿Qué población y limitación describe el caso C2 sobre duración de resolución?",
			expectedSelection: caseSummary("C2"),
			expectedTarget: "resolution_days",
			expectedStatus: "exploratory_not_promoted",
		},
		{
			fixtureId: "kg-case-c3-fraud-signal-scope",
			question:
				"¿Qué representa el caso C3 de señal de fraude para investigación y por qué no decide una transacción individual?",
			expectedSelection: caseSummary("C3"),
			expectedTarget: "is_fraud",
			expectedStatus: "exploratory_not_promoted",
		},
		{
			fixtureId: "kg-case-c4-followup-scope",
			question:
				"¿Qué restricciones tiene el caso C4 de seguimiento o escalamiento de atención transaccional?",
			expectedSelection: caseSummary("C4"),
			expectedTarget: "requires_followup|was_escalated",
			expectedStatus: "exploratory_not_promoted",
		},
		{
			fixtureId: "kg-case-c5-satisfaction-scope",
			question:
				"¿Qué mide de forma exploratoria el caso C5 de satisfacción y qué no autoriza?",
			expectedSelection: caseSummary("C5"),
			expectedTarget: "main_score",
			expectedStatus: "exploratory_not_promoted",
		},
	];
