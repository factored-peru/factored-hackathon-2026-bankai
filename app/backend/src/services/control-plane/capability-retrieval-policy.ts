import type { RetrievalPolicyGate } from "./rag-state-graph.js";

/**
 * Read capabilities that authorize factual retrieval (Structured or KG).
 * Escalation stays on conversational policy (`REQUIRE_APPROVAL`), never here.
 */
export const RETRIEVAL_READ_CAPABILITIES = [
	"movements:read",
	"dispute.read",
	"dispute.transaction.read",
] as const;

/**
 * ADR 0004 retrieval gate: allow authorized reads, clarify empty catalogs,
 * deny missing capability. Does not escalate.
 */
export const capabilityRetrievalPolicy: RetrievalPolicyGate = {
	authorize: async ({ session, catalog }) => {
		const permitted = RETRIEVAL_READ_CAPABILITIES.some((capability) =>
			session.capabilities.includes(capability),
		);
		if (!permitted) return "deny";
		if (catalog.entries.length === 0) return "clarify";
		return "allow";
	},
};
