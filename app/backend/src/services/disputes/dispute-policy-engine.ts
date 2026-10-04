import type {
	ModelDecision,
	PolicyDecision,
} from "../../domain/control/contracts.js";
import {
	canonicalizeDisputeRoles,
	DISPUTE_CAPABILITY_MATRIX_VERSION,
	DISPUTE_POLICY_ID,
	type DisputeCapabilityActionId,
	disputeCapabilityMatrixByActionId,
} from "../../domain/disputes/capability-matrix.js";
import type { SessionContext } from "../../domain/session.js";
import { stableHash } from "../control-plane/stable-hash.js";
import type { PolicyEngine } from "../ports/control.js";

/** @deprecated Prefer disputeCapabilityMatrixByActionId from domain. */
export const disputeCapabilityMatrix = Object.fromEntries(
	Object.entries(disputeCapabilityMatrixByActionId).map(([actionId, entry]) => [
		actionId,
		{
			roles: entry.roles,
			capability: entry.capability,
			outcome: entry.outcome,
		},
	]),
) as Record<
	string,
	Readonly<{
		roles: readonly string[];
		capability: string;
		outcome: PolicyDecision["outcome"];
	}>
>;

function operationFrom(input: {
	state: { requestedTool: string | null };
	modelDecision: ModelDecision;
}): DisputeCapabilityActionId | null {
	const candidate =
		input.state.requestedTool ??
		(input.modelDecision.kind === "tool"
			? input.modelDecision.call.toolId
			: null);
	if (!candidate || !(candidate in disputeCapabilityMatrixByActionId)) {
		return null;
	}
	return candidate as DisputeCapabilityActionId;
}

export class DisputePolicyEngine implements PolicyEngine {
	async evaluate(input: {
		session: SessionContext;
		state: Parameters<PolicyEngine["evaluate"]>[0]["state"];
		modelDecision: ModelDecision;
		signal: Parameters<PolicyEngine["evaluate"]>[0]["signal"];
	}): Promise<PolicyDecision> {
		const operation = operationFrom(input);
		const definition = operation
			? disputeCapabilityMatrixByActionId[operation]
			: null;
		const sessionRoles = canonicalizeDisputeRoles(input.session.roles);
		const rolePermitted = Boolean(
			definition?.roles.some((role) => sessionRoles.includes(role)),
		);
		const capabilityPermitted = Boolean(
			definition &&
				definition.capability.length > 0 &&
				input.session.capabilities.includes(definition.capability),
		);
		const permitted = Boolean(
			definition &&
				definition.outcome !== "DENY" &&
				rolePermitted &&
				capabilityPermitted,
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
			policyId: DISPUTE_POLICY_ID,
			policyVersion: DISPUTE_CAPABILITY_MATRIX_VERSION,
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
