/**
 * Versioned synthetic Dispute Transaction Support pack for tests.
 * Source of truth: domain demo fixtures (runtime-safe, no PII).
 */
export {
	assertDemoDisputePackIsSynthetic,
	DEMO_DISPUTE_FIXTURE_VERSION,
	DEMO_DISPUTE_TENANT_ID,
	demoDisputePack,
	demoDisputePackSchema,
} from "../../src/domain/disputes/demo-fixtures.js";
