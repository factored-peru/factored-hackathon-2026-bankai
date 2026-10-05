import { describe, expect, test } from "bun:test";
import {
	buildFixtureSeedPlan,
	identityDocId,
	seedPlanDryRunJson,
} from "../src/integrations/identity/demo-identity-seed.js";

describe("demo identity seed plan", () => {
	test("fixture plan covers customer and backoffice without source values", () => {
		const plan = buildFixtureSeedPlan();
		expect(plan.mode).toBe("fixture");
		expect(plan.containsSourceValues).toBe(false);
		expect(plan.actors).toHaveLength(2);
		expect(plan.actors[0]?.userId).toBe("demo-customer-1");
		expect(plan.actors[0]?.hasCustomerBinding).toBe(true);
		expect(plan.actors[1]?.userId).toBe("demo-backoffice-1");
		expect(plan.actors[0]?.docId).toBe(
			identityDocId(plan.tenantId, "demo-customer-1"),
		);
	});

	test("dry-run JSON never embeds customer ids or raw bindings", () => {
		const json = seedPlanDryRunJson(buildFixtureSeedPlan());
		expect(json).toContain('"mode": "dry-run"');
		expect(json).toContain('"containsSourceValues": false');
		expect(json).not.toContain("synthetic-customer");
		expect(json).not.toContain("customerId");
	});
});
