/**
 * Sanitized plan for seeding demo identity into Firestore.
 * Never logs customer IDs; execute path writes them only to private collections.
 */
import { createHash } from "node:crypto";

export const DEMO_TENANT_ID = "demo-bankai";

export type SeedActorRole = "customer" | "backoffice";

export type SeedActorPlan = Readonly<{
	userId: string;
	role: SeedActorRole;
	roles: readonly string[];
	capabilities: readonly string[];
	displayLabel: string;
	/** Present only for customers; never printed by dry-run. */
	hasCustomerBinding: boolean;
	docId: string;
}>;

export type DemoIdentitySeedPlan = Readonly<{
	mode: "fixture" | "bigquery_cohort";
	tenantId: string;
	profilesCollection: string;
	bindingsCollection: string;
	actors: readonly SeedActorPlan[];
	containsSourceValues: false;
}>;

const customerCapabilities = [
	"dispute.read",
	"dispute.transaction.read",
	"dispute.escalation.request",
	"conversation:write",
] as const;

const backofficeCapabilities = [
	"dispute.read",
	"dispute.transaction.read",
	"conversation:read:any",
	"dispute.escalation.decide",
] as const;

export function identityDocId(tenantId: string, userId: string): string {
	return createHash("sha256").update(`${tenantId}\0${userId}`).digest("hex");
}

/** CI / local default: opaque synthetic ids, no BigQuery. */
export function buildFixtureSeedPlan(
	tenantId: string = DEMO_TENANT_ID,
): DemoIdentitySeedPlan {
	const actors: SeedActorPlan[] = [
		{
			userId: "demo-customer-1",
			role: "customer",
			roles: ["customer"],
			capabilities: [...customerCapabilities],
			displayLabel: "Cliente demo recomendado",
			hasCustomerBinding: true,
			docId: identityDocId(tenantId, "demo-customer-1"),
		},
		{
			userId: "demo-backoffice-1",
			role: "backoffice",
			roles: ["backoffice"],
			capabilities: [...backofficeCapabilities],
			displayLabel: "Backoffice demo",
			hasCustomerBinding: false,
			docId: identityDocId(tenantId, "demo-backoffice-1"),
		},
	];
	return {
		mode: "fixture",
		tenantId,
		profilesCollection: "user_profiles",
		bindingsCollection: "customer_identity_bindings",
		actors,
		containsSourceValues: false,
	};
}

export type CohortActor = Readonly<{
	userId: string;
	role: SeedActorRole;
	label: string;
	/** Server-only; omitted from dry-run JSON. */
	customerId: string | null;
}>;

export function buildCohortSeedPlan(
	actors: readonly CohortActor[],
	tenantId: string = DEMO_TENANT_ID,
): DemoIdentitySeedPlan {
	return {
		mode: "bigquery_cohort",
		tenantId,
		profilesCollection: "user_profiles",
		bindingsCollection: "customer_identity_bindings",
		actors: actors.map((actor) => ({
			userId: actor.userId,
			role: actor.role,
			roles: [actor.role],
			capabilities:
				actor.role === "backoffice"
					? [...backofficeCapabilities]
					: [...customerCapabilities],
			displayLabel: actor.label,
			hasCustomerBinding: actor.customerId !== null,
			docId: identityDocId(tenantId, actor.userId),
		})),
		containsSourceValues: false,
	};
}

/** Synthetic customer ids for fixture bindings (not real bank customers). */
export function fixtureCustomerId(userId: string): string {
	return `synthetic-customer-${userId}`;
}

export function seedPlanDryRunJson(plan: DemoIdentitySeedPlan): string {
	return `${JSON.stringify(
		{
			stage: "seed-firestore-demo-identity",
			mode: "dry-run",
			prepare_mode: plan.mode,
			tenantId: plan.tenantId,
			profilesCollection: plan.profilesCollection,
			bindingsCollection: plan.bindingsCollection,
			actorCount: plan.actors.length,
			actors: plan.actors.map((actor) => ({
				userId: actor.userId,
				role: actor.role,
				roles: actor.roles,
				capabilityCount: actor.capabilities.length,
				hasCustomerBinding: actor.hasCustomerBinding,
				docIdPrefix: actor.docId.slice(0, 12),
			})),
			containsSourceValues: false,
			cloud_execution: "not_requested",
		},
		null,
		2,
	)}\n`;
}
