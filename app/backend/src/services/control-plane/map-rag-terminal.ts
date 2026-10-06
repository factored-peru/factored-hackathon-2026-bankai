import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import type { RouteExecutionResult } from "./pipeline-contracts.js";

const CLARIFY_TERMINALS = new Set([
	"structured_selection_ambiguous",
	"kg_selection_ambiguous",
	"retrieval_policy_clarify",
	"structured_parameters_missing",
]);

const DENY_TERMINALS = new Set([
	"structured_jev_denied",
	"kg_jev_denied",
	"retrieval_policy_denied",
	"structured_query_not_allowlisted",
	"kg_operation_not_allowlisted",
	"structured_query_not_selected",
]);

export type RagTerminalMapping =
	| Readonly<{ kind: "ready"; evidence: readonly ModelEvidence[] }>
	| Readonly<{ kind: "clarify"; reasonCode: string }>
	| Readonly<{ kind: "denied"; reasonCode: string }>
	| Readonly<{ kind: "failed"; reasonCode: string }>;

/**
 * Maps StateGraph terminalReason / evidence into ACS route outcomes.
 * Ambiguous specialized JEV and retrieval_policy_clarify become clarification.
 */
export function mapRagTerminal(input: {
	terminalReason: string | null;
	evidence: readonly ModelEvidence[] | null;
}): RagTerminalMapping {
	if (input.terminalReason === null) {
		if (input.evidence === null || input.evidence.length === 0) {
			return { kind: "failed", reasonCode: "rag_evidence_missing" };
		}
		return { kind: "ready", evidence: input.evidence };
	}
	if (CLARIFY_TERMINALS.has(input.terminalReason)) {
		return { kind: "clarify", reasonCode: input.terminalReason };
	}
	if (DENY_TERMINALS.has(input.terminalReason)) {
		return { kind: "denied", reasonCode: input.terminalReason };
	}
	return { kind: "failed", reasonCode: input.terminalReason };
}

export function clarificationQuestionFor(
	reasonCode: string,
): "clarify_domain" | "clarify_account" | "clarify_period" {
	if (
		reasonCode === "structured_parameters_missing" ||
		reasonCode.includes("period")
	) {
		return "clarify_period";
	}
	if (reasonCode.includes("account")) {
		return "clarify_account";
	}
	return "clarify_domain";
}

export function toDeniedOrFailed(
	mapping: Extract<RagTerminalMapping, { kind: "denied" | "failed" }>,
): Extract<RouteExecutionResult, { status: "denied" | "failed" }> {
	return { status: mapping.kind, reasonCode: mapping.reasonCode };
}
