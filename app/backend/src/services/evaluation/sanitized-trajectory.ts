import type { EvaluationScenario, PipelineRunRecord } from "./ab-contracts.js";

/**
 * AgentEvals-inspired trajectory projection: ordered steps + outcome flags.
 * Never carries prompt, response, SQL, rows, or PII (ADR 0010 / 0015).
 */

export type SanitizedTrajectoryStep = Readonly<{
	name: string;
	route: string;
}>;

export type SanitizedTrajectorySide = Readonly<{
	steps: readonly SanitizedTrajectoryStep[];
	status: string;
	route: string;
	toolOutcome: string;
	/** Whether a terminal error/deny is expected or observed (not the raw code). */
	hasError: boolean;
	hasQueryPlan: boolean;
	gates: Readonly<{
		controlPlane: boolean;
		privacy: boolean;
		guardrail: boolean;
		policy: boolean;
	}>;
	retrievalAttempted: boolean;
	retrievalSucceeded: boolean;
}>;

export type SanitizedTrajectoryProjection = Readonly<{
	scenarioId: string;
	pipeline: "baseline" | "controlled";
	/** Opaque labels for external judges (no product naming). */
	workflowLabel: "workflow_A" | "workflow_B";
	outputs: SanitizedTrajectorySide;
	referenceOutputs: SanitizedTrajectorySide;
}>;

export function workflowLabelForPipeline(
	pipeline: "baseline" | "controlled",
): "workflow_A" | "workflow_B" {
	return pipeline === "baseline" ? "workflow_A" : "workflow_B";
}

function stepsFromGates(
	gates: SanitizedTrajectorySide["gates"],
	terminalRoute: string,
	retrievalAttempted: boolean,
): SanitizedTrajectoryStep[] {
	const steps: SanitizedTrajectoryStep[] = [];
	if (gates.privacy) steps.push({ name: "privacy", route: "policy" });
	if (gates.guardrail) steps.push({ name: "guardrail", route: "policy" });
	if (gates.controlPlane) {
		steps.push({ name: "control_plane", route: terminalRoute });
	}
	if (gates.policy) steps.push({ name: "policy", route: "policy" });
	if (retrievalAttempted) {
		steps.push({ name: "retrieval", route: terminalRoute });
	}
	steps.push({ name: "terminal", route: terminalRoute });
	return steps;
}

function observedSide(record: PipelineRunRecord): SanitizedTrajectorySide {
	return {
		steps: stepsFromGates(
			record.gatesInvoked,
			record.route,
			record.retrievalAttemptCount > 0,
		),
		status: record.status,
		route: record.route,
		toolOutcome: record.toolOutcome,
		hasError:
			record.errorCode !== null ||
			record.status === "denied" ||
			record.status === "failed",
		hasQueryPlan: record.queryPlanId !== null,
		gates: record.gatesInvoked,
		retrievalAttempted: record.retrievalAttemptCount > 0,
		retrievalSucceeded: record.retrievalSuccessCount > 0,
	};
}

/**
 * Align reference toolOutcome with ControlledComparableRunner so fail-closed /
 * DENY / OOD scenarios are judged as matches when the workflow behaved as
 * specified (not as "task success").
 */
function expectedControlledToolOutcome(
	scenario: EvaluationScenario,
): PipelineRunRecord["toolOutcome"] {
	const status = scenario.expectedTerminalStatus;
	if (status === "denied") return "denied";
	if (status === "failed") {
		const mode = scenario.controlledMode;
		if (
			mode === "guardrail_block" ||
			mode === "jev_unavailable" ||
			mode === "session_rotated"
		) {
			return "skipped";
		}
		if (scenario.expectedRetrieval) return "ready";
		return "none";
	}
	if (scenario.expectedRetrieval && status === "completed") return "ready";
	return "none";
}

function referenceSide(
	scenario: EvaluationScenario,
	pipeline: "baseline" | "controlled",
): SanitizedTrajectorySide {
	if (pipeline === "baseline") {
		const gates = {
			controlPlane: false,
			privacy: false,
			guardrail: false,
			policy: false,
		};
		const retrieval = Boolean(
			scenario.expectedRetrieval && scenario.expectedQueryPlanId,
		);
		return {
			steps: stepsFromGates(gates, "llm", retrieval),
			status: "completed",
			route: "llm",
			toolOutcome: retrieval ? "ready" : "none",
			hasError: false,
			hasQueryPlan: Boolean(scenario.expectedQueryPlanId),
			gates,
			retrievalAttempted: retrieval,
			retrievalSucceeded: retrieval,
		};
	}

	const gates = scenario.controlledExpectsGates;
	const status = scenario.expectedTerminalStatus;
	const toolOutcome = expectedControlledToolOutcome(scenario);
	return {
		steps: stepsFromGates(
			gates,
			scenario.expectedRoute,
			scenario.expectedRetrieval,
		),
		status,
		route: scenario.expectedRoute,
		toolOutcome,
		hasError: status === "denied" || status === "failed",
		hasQueryPlan: scenario.expectedQueryPlanId !== null,
		gates,
		retrievalAttempted: scenario.expectedRetrieval,
		retrievalSucceeded: toolOutcome === "ready",
	};
}

export function toSanitizedTrajectory(
	scenario: EvaluationScenario,
	record: PipelineRunRecord,
): SanitizedTrajectoryProjection {
	return {
		scenarioId: scenario.scenarioId,
		pipeline: record.pipeline,
		workflowLabel: workflowLabelForPipeline(record.pipeline),
		outputs: observedSide(record),
		referenceOutputs: referenceSide(scenario, record.pipeline),
	};
}

const FORBIDDEN_PROJECTION_KEYS = [
	"prompt",
	"response",
	"message",
	"sql",
	"rows",
	"sessionId",
	"session_id",
	"customerId",
	"customer_id",
	"pii",
	"evidence",
	"arguments",
] as const;

export function assertSanitizedTrajectory(
	projection: SanitizedTrajectoryProjection,
): void {
	const serialized = JSON.stringify(projection);
	for (const key of FORBIDDEN_PROJECTION_KEYS) {
		if (serialized.toLowerCase().includes(`"${key.toLowerCase()}"`)) {
			throw new Error(`sanitized_trajectory_forbidden_key:${key}`);
		}
	}
}
