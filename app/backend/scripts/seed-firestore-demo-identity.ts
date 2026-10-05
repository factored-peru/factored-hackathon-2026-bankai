#!/usr/bin/env bun
/**
 * Seed Firestore user_profiles + customer_identity_bindings for demo actors.
 *
 * Default is --dry-run (safe for CI). --execute writes to GCP and needs ADC +
 * authorization. Never logs customer IDs or PII.
 */
import { BigQuery } from "@google-cloud/bigquery";
import { Firestore } from "@google-cloud/firestore";
import { BigQueryDemoActorDirectory } from "../src/integrations/bigquery/bigquery-demo-actor-directory.js";
import { FirestoreUserProfileStore } from "../src/integrations/firestore/firestore-user-profile-store.js";
import {
	buildCohortSeedPlan,
	buildFixtureSeedPlan,
	type CohortActor,
	type DemoIdentitySeedPlan,
	fixtureCustomerId,
	seedPlanDryRunJson,
} from "../src/integrations/identity/demo-identity-seed.js";

function usage(): never {
	console.error(
		"usage: bun scripts/seed-firestore-demo-identity.ts [--dry-run|--execute] [--fixture|--from-bigquery]",
	);
	process.exit(2);
}

function parseArgs(argv: string[]) {
	let execute = false;
	let source: "fixture" | "bigquery" = "fixture";
	for (const arg of argv) {
		if (arg === "--dry-run") execute = false;
		else if (arg === "--execute") execute = true;
		else if (arg === "--fixture") source = "fixture";
		else if (arg === "--from-bigquery") source = "bigquery";
		else if (arg === "--help" || arg === "-h") usage();
		else {
			console.error(`unknown argument: ${arg}`);
			usage();
		}
	}
	return { execute, source };
}

async function loadPlan(source: "fixture" | "bigquery"): Promise<{
	plan: DemoIdentitySeedPlan;
	customerByUserId: Map<string, string>;
}> {
	const customerByUserId = new Map<string, string>();
	if (source === "fixture") {
		const plan = buildFixtureSeedPlan();
		for (const actor of plan.actors) {
			if (actor.hasCustomerBinding) {
				customerByUserId.set(actor.userId, fixtureCustomerId(actor.userId));
			}
		}
		return { plan, customerByUserId };
	}

	const project =
		process.env.GOOGLE_CLOUD_PROJECT?.trim() || "factored-hackathon";
	const dataset = process.env.BIGQUERY_DATASET?.trim() || "hackathon";
	const hmac = process.env.DEMO_ACTOR_HMAC_KEY?.trim();
	if (!hmac) {
		throw new Error("DEMO_ACTOR_HMAC_KEY is required for --from-bigquery");
	}
	const directory = new BigQueryDemoActorDirectory(
		new BigQuery({ projectId: project }),
		project,
		dataset,
		hmac,
	);
	const listed = await directory.list();
	const cohort: CohortActor[] = [];
	for (const item of listed) {
		const resolved = await directory.resolve(item.actorId);
		if (!resolved) continue;
		const customerId = await directory.customerIdForActor(item.actorId);
		cohort.push({
			userId: resolved.userId,
			role: item.role,
			label: item.label,
			customerId,
		});
		if (customerId) customerByUserId.set(resolved.userId, customerId);
	}
	return { plan: buildCohortSeedPlan(cohort), customerByUserId };
}

async function executeSeed(
	plan: DemoIdentitySeedPlan,
	customerByUserId: Map<string, string>,
): Promise<void> {
	const project =
		process.env.GOOGLE_CLOUD_PROJECT?.trim() || "factored-hackathon";
	const firestore = new Firestore({ projectId: project });
	const profiles = new FirestoreUserProfileStore(
		firestore,
		plan.profilesCollection,
	);
	let profilesWritten = 0;
	let bindingsWritten = 0;
	for (const actor of plan.actors) {
		await profiles.upsert({
			tenantId: plan.tenantId,
			userId: actor.userId,
			roles: [...actor.roles],
			capabilities: [...actor.capabilities],
			status: "active",
			displayLabel: actor.displayLabel,
		});
		profilesWritten += 1;
		const customerId = customerByUserId.get(actor.userId);
		if (customerId) {
			await firestore.collection(plan.bindingsCollection).doc(actor.docId).set({
				tenantId: plan.tenantId,
				userId: actor.userId,
				customerId,
				status: "active",
				version: "demo-identity-seed-v1",
			});
			bindingsWritten += 1;
		}
	}
	console.log(
		JSON.stringify({
			stage: "seed-firestore-demo-identity",
			mode: "execute",
			prepare_mode: plan.mode,
			tenantId: plan.tenantId,
			profilesWritten,
			bindingsWritten,
			containsSourceValues: false,
		}),
	);
}

async function main(): Promise<void> {
	const { execute, source } = parseArgs(process.argv.slice(2));
	const { plan, customerByUserId } = await loadPlan(source);
	if (!execute) {
		process.stdout.write(seedPlanDryRunJson(plan));
		return;
	}
	await executeSeed(plan, customerByUserId);
}

main().catch((error: unknown) => {
	const message = error instanceof Error ? error.message : String(error);
	console.error(
		JSON.stringify({ error: message, containsSourceValues: false }),
	);
	process.exit(1);
});
