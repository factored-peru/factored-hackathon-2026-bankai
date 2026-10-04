import { z } from "zod";

export const DISPUTE_CAPABILITY_MATRIX_VERSION = "v1" as const;
export const DISPUTE_POLICY_ID = "dispute-transaction-support" as const;

export const disputeCapabilityOutcomeSchema = z.enum([
	"ALLOW",
	"DENY",
	"REQUIRE_APPROVAL",
]);
export type DisputeCapabilityOutcome = z.infer<
	typeof disputeCapabilityOutcomeSchema
>;

export const disputeCanonicalRoleSchema = z.enum(["client", "operator"]);
export type DisputeCanonicalRole = z.infer<typeof disputeCanonicalRoleSchema>;

/** Demo / OpenAPI surface roles mapped to ADR 0006 claims. */
export const DEMO_ROLE_ALIASES: Readonly<Record<string, DisputeCanonicalRole>> =
	{
		client: "client",
		customer: "client",
		operator: "operator",
		backoffice: "operator",
	};

export function canonicalizeDisputeRoles(
	roles: readonly string[],
): readonly DisputeCanonicalRole[] {
	const canonical = new Set<DisputeCanonicalRole>();
	for (const role of roles) {
		const mapped = DEMO_ROLE_ALIASES[role];
		if (mapped) canonical.add(mapped);
	}
	return [...canonical];
}

export const disputeCapabilityMockSchema = z
	.object({
		effect: z.literal("none"),
		provenance: z.enum(["local_mock", "not_applicable"]),
		description: z.string().min(1),
	})
	.strict();

export const disputeCapabilityEntrySchema = z
	.object({
		actionId: z.string().min(1),
		outcome: disputeCapabilityOutcomeSchema,
		roles: z.array(disputeCanonicalRoleSchema),
		capability: z.string(),
		allowedData: z.array(z.string().min(1)),
		requiredEvidence: z.array(z.string().min(1)),
		mock: disputeCapabilityMockSchema,
		version: z.literal(DISPUTE_CAPABILITY_MATRIX_VERSION),
	})
	.strict()
	.superRefine((entry, ctx) => {
		if (entry.outcome === "DENY") {
			if (entry.roles.length > 0) {
				ctx.addIssue({
					code: "custom",
					message: "DENY actions must not grant roles",
					path: ["roles"],
				});
			}
			if (entry.capability !== "") {
				ctx.addIssue({
					code: "custom",
					message: "DENY actions must not expose a capability",
					path: ["capability"],
				});
			}
			if (entry.mock.provenance !== "not_applicable") {
				ctx.addIssue({
					code: "custom",
					message: "DENY actions must not register a bank mock",
					path: ["mock", "provenance"],
				});
			}
		} else if (entry.capability.length === 0) {
			ctx.addIssue({
				code: "custom",
				message: "non-DENY actions require a capability",
				path: ["capability"],
			});
		}
	});
export type DisputeCapabilityEntry = z.infer<
	typeof disputeCapabilityEntrySchema
>;

const matrixEntries = [
	{
		actionId: "transaction.read",
		outcome: "ALLOW",
		roles: ["client", "operator"],
		capability: "dispute.transaction.read",
		allowedData: [
			"transactionId",
			"status",
			"amountBucket",
			"currency",
			"provenance",
			"version",
		],
		requiredEvidence: ["transactionEvidence"],
		mock: {
			effect: "none",
			provenance: "local_mock",
			description: "Read-only synthetic or catalog-backed transaction evidence",
		},
		version: DISPUTE_CAPABILITY_MATRIX_VERSION,
	},
	{
		actionId: "dispute.read",
		outcome: "ALLOW",
		roles: ["client", "operator"],
		capability: "dispute.read",
		allowedData: [
			"disputeId",
			"transactionId",
			"status",
			"priority",
			"provenance",
			"version",
		],
		requiredEvidence: ["disputeEvidence"],
		mock: {
			effect: "none",
			provenance: "local_mock",
			description: "Read-only synthetic or catalog-backed dispute evidence",
		},
		version: DISPUTE_CAPABILITY_MATRIX_VERSION,
	},
	{
		actionId: "escalation.request",
		outcome: "REQUIRE_APPROVAL",
		roles: ["client"],
		capability: "dispute.escalation.request",
		allowedData: ["caseId", "reasonCode", "approvalId"],
		requiredEvidence: ["disputeCase", "transactionEvidence"],
		mock: {
			effect: "none",
			provenance: "local_mock",
			description:
				"Mock HITL escalation with operator decision; no bank-side effect",
		},
		version: DISPUTE_CAPABILITY_MATRIX_VERSION,
	},
	{
		actionId: "dispute.submit",
		outcome: "DENY",
		roles: [],
		capability: "",
		allowedData: [],
		requiredEvidence: [],
		mock: {
			effect: "none",
			provenance: "not_applicable",
			description: "Submitting a real bank dispute is not supported in P0",
		},
		version: DISPUTE_CAPABILITY_MATRIX_VERSION,
	},
	{
		actionId: "dispute.cancel",
		outcome: "DENY",
		roles: [],
		capability: "",
		allowedData: [],
		requiredEvidence: [],
		mock: {
			effect: "none",
			provenance: "not_applicable",
			description: "Cancelling a real bank dispute is not supported in P0",
		},
		version: DISPUTE_CAPABILITY_MATRIX_VERSION,
	},
] as const;

export const disputeCapabilityMatrixSchema = z
	.array(disputeCapabilityEntrySchema)
	.min(1);

export const disputeCapabilityMatrix: readonly DisputeCapabilityEntry[] =
	disputeCapabilityMatrixSchema.parse(matrixEntries);

export const disputeCapabilityMatrixByActionId: Readonly<
	Record<string, DisputeCapabilityEntry>
> = Object.fromEntries(
	disputeCapabilityMatrix.map((entry) => [entry.actionId, entry]),
);

export type DisputeCapabilityActionId =
	(typeof matrixEntries)[number]["actionId"];
