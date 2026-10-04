import { describe, expect, test } from "bun:test";
import {
	assertDemoDisputePackIsSynthetic,
	demoDisputePack,
	demoDisputePackSchema,
} from "./fixtures/demo-dispute-pack.js";

describe("demo dispute fixture pack", () => {
	test("parses the versioned synthetic pack", () => {
		const pack = demoDisputePackSchema.parse(demoDisputePack);
		expect(pack.version).toBe("dispute-demo-v1");
		expect(pack.actors.map((actor) => actor.actorId)).toEqual([
			"demo-customer-1",
			"demo-backoffice-1",
		]);
		expect(pack.sessionTemplates).toHaveLength(2);
		expect(pack.cases[0]).toMatchObject({
			caseId: "demo-case-1",
			provenance: "synthetic_local_fixture",
			version: "dispute-demo-v1",
		});
	});

	test("rejects real bank PII, secrets and raw card numbers", () => {
		expect(() => assertDemoDisputePackIsSynthetic()).not.toThrow();
		expect(JSON.stringify(demoDisputePack)).not.toContain("demo-customer-1@");
	});
});
