import type {
	ModelDecision,
	PolicyDecision,
} from "../../domain/control/contracts.js";
import type { SessionContext } from "../../domain/session.js";
import { stableHash } from "../control-plane/stable-hash.js";
import type { PolicyEngine } from "../ports/control.js";

export const disputeCapabilityMatrix = {
	"transaction.read": {
		roles: ["client", "operator"],
		capability: "dispute.transaction.read",
		outcome: "ALLOW",
	},
	"dispute.read": {
		roles: ["client", "operator"],
		capability: "dispute.read",
		outcome: "ALLOW",
	},
	"escalation.request": {
		roles: ["client"],
		capability: "dispute.escalation.request",
		outcome: "REQUIRE_APPROVAL",
	},
	"dispute.submit": {
		roles: [],
		capability: "",
		outcome: "DENY",
	},
	"dispute.cancel": {
		roles: [],
		capability: "",
		outcome: "DENY",
	},
} as const satisfies Record<
	string,
	Readonly<{
		roles: readonly string[];
		capability: string;
		outcome: PolicyDecision["outcome"];
	}>
>;

type DisputeOperation = keyof typeof disputeCapabilityMatrix;

function operationFrom(input: {
	state: { requestedTool: string | null };
	modelDecision: ModelDecision;
}): DisputeOperation | null {
	const candidate =
		input.state.requestedTool ??
		(input.modelDecision.kind === "tool"
			? input.modelDecision.call.toolId
			: null);
	return candidate && candidate in disputeCapabilityMatrix
		? (candidate as DisputeOperation)
		: null;
}

export class DisputePolicyEngine implements PolicyEngine {
	async evaluate(input: {
		session: SessionContext;
		state: Parameters<PolicyEngine["evaluate"]>[0]["state"];
		modelDecision: ModelDecision;
		signal: Parameters<PolicyEngine["evaluate"]>[0]["signal"];
	}): Promise<PolicyDecision> {
		const operation = operationFrom(input);
		const definition = operation ? disputeCapabilityMatrix[operation] : null;
		const permitted = Boolean(
			definition &&
				definition.outcome !== "DENY" &&
				definition.roles.some((role) => input.session.roles.includes(role)) &&
				input.session.capabilities.includes(definition.capability),
		);
		const outcome =
			definition?.outcome === "DENY" || !permitted
				? "DENY"
				: (definition?.outcome ?? "DENY");
		return {
			outcome,
			decisionId: stableHash({
				session: input.session.sessionId,
				operation,
				outcome,
			}),
			policyId: "dispute-transaction-support",
			policyVersion: "v1",
			riskLevel: outcome === "REQUIRE_APPROVAL" ? "medium" : "low",
			reasons: [
				outcome === "DENY"
					? definition?.outcome === "DENY"
						? "bank_dispute_action_not_supported"
						: "capability_or_role_denied"
					: (operation ?? "no_dispute_operation"),
			],
		};
	}
}
