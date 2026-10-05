import { describe, expect, test } from "bun:test";
import { runEvaluationGoldenSet } from "../scripts/evaluate-goldens.js";
import {
	evaluationRecordInsertId,
	evaluationResultRecordSchema,
} from "../src/domain/observability/evaluation-result-record.js";
import {
	evaluationMetricNames,
	TelemetryAttributeError,
	telemetryIdentifierSchema,
	validateMetricAttributes,
	validateSpanAttributes,
} from "../src/domain/observability/telemetry-attributes.js";
import { evaluationGoldens } from "./fixtures/evaluation-goldens.js";

const pseudonym = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

function rejection(action: () => unknown): TelemetryAttributeError {
	try {
		action();
	} catch (error) {
		expect(error).toBeInstanceOf(TelemetryAttributeError);
		return error as TelemetryAttributeError;
	}
	throw new Error("expected the attribute to be rejected");
}

describe("telemetry attribute contract", () => {
	test("accepts allowlisted span metadata and evaluation results", () => {
		const attributes = validateSpanAttributes({
			"bankai.correlator": pseudonym,
			"bankai.span": "model_armor",
			"bankai.outcome": "no_match_found",
			"bankai.guardrail_status": "NO_MATCH_FOUND",
			"bankai.latency_ms": 12,
			"eval.fixture_id": "route-llm-01",
			"eval.route_correct.score": 1,
			"eval.route_correct.label": "pass",
			"eval.route_correct.reason_code": "none",
		});
		expect(attributes["bankai.span"]).toBe("model_armor");
		expect(attributes["eval.route_correct.score"]).toBe(1);
	});

	test("drops undefined optional values instead of exporting them", () => {
		const attributes = validateSpanAttributes({
			"bankai.span": "policy",
			"bankai.tool_id": undefined,
		});
		expect(Object.keys(attributes)).toEqual(["bankai.span"]);
	});

	test("rejects content keys by name, including namespaced ones", () => {
		for (const key of [
			"prompt",
			"gen_ai.prompt",
			"bankai.sql",
			"response",
			"tenantId",
			"traceId",
			"cookie",
		]) {
			expect(
				rejection(() => validateSpanAttributes({ [key]: "x" })).reason,
			).toBe("forbidden_key");
		}
	});

	test("rejects unknown keys and metrics outside the closed catalog", () => {
		expect(
			rejection(() => validateSpanAttributes({ "bankai.free_text": "x" }))
				.reason,
		).toBe("unknown_key");
		expect(
			rejection(() =>
				validateSpanAttributes({ "eval.invented_metric.score": 1 }),
			).reason,
		).toBe("unknown_key");
	});

	test("rejects free text and raw IDs even under an allowed key", () => {
		const cases: Record<string, unknown> = {
			"bankai.outcome": "the customer asked about card 4111",
			"bankai.correlator": "trace-123",
			"bankai.session_hash": "raw-session-id",
			"eval.fixture_id": "has spaces and a very long free text value",
			"bankai.latency_ms": -1,
			"eval.route_correct.score": 2,
		};
		for (const [key, value] of Object.entries(cases)) {
			expect(
				rejection(() => validateSpanAttributes({ [key]: value })).reason,
			).toBe("invalid_value");
		}
	});

	test("never echoes the offending value in the error", () => {
		const secret = "super-secret-customer-text";
		const error = rejection(() =>
			validateSpanAttributes({ "bankai.outcome": secret }),
		);
		expect(error.message).not.toContain(secret);
		expect(error.message).toBe(
			"telemetry_attribute_rejected:invalid_value:bankai.outcome",
		);
		const malformed = rejection(() =>
			validateSpanAttributes({ [`bad key ${secret}`]: 1 }),
		);
		expect(malformed.message).not.toContain(secret);
	});

	test("metric attributes are low cardinality: no IDs, hashes or fixtures", () => {
		expect(
			validateMetricAttributes({
				"eval.metric": "route_correct",
				"eval.label": "pass",
				"bankai.route": "llm",
			}),
		).toEqual({
			"eval.metric": "route_correct",
			"eval.label": "pass",
			"bankai.route": "llm",
		});
		for (const key of [
			"bankai.correlator",
			"bankai.session_hash",
			"bankai.tenant_hash",
			"eval.fixture_id",
		]) {
			expect(
				rejection(() => validateMetricAttributes({ [key]: pseudonym })).reason,
			).toBe("unknown_key");
		}
	});
});

describe("evaluation result record", () => {
	const record = {
		schemaVersion: "v1",
		runId: "run-20261004-0001",
		matrixVersion: "p0-v1",
		fixtureId: "route-llm-01",
		route: "llm",
		metric: "route_correct",
		score: 1,
		passed: true,
		label: "pass",
		reasonCode: null,
		evaluator: "base_agent",
		evaluatorVersion: "v1",
		mode: "deterministic",
		gate: "informational",
		policyVersion: "p0-v1",
		catalogVersion: null,
		correlator: pseudonym,
		recordedAt: "2026-10-04T12:00:00.000Z",
	} as const;

	test("accepts a sanitized, versioned record", () => {
		expect(evaluationResultRecordSchema.parse(record)).toEqual(record);
	});

	test("rejects extra fields so content cannot ride along", () => {
		expect(() =>
			evaluationResultRecordSchema.parse({ ...record, prompt: "leak" }),
		).toThrow();
		expect(() =>
			evaluationResultRecordSchema.parse({ ...record, traceId: "t" }),
		).toThrow();
	});

	test("rejects blocking gates and unknown schema versions", () => {
		expect(() =>
			evaluationResultRecordSchema.parse({ ...record, gate: "blocking" }),
		).toThrow();
		expect(() =>
			evaluationResultRecordSchema.parse({ ...record, schemaVersion: "v2" }),
		).toThrow();
	});

	test("insert id is stable and distinguishes evaluators", () => {
		const id = evaluationRecordInsertId(
			evaluationResultRecordSchema.parse(record),
		);
		expect(id).toBe(
			"run-20261004-0001:route-llm-01:llm:route_correct:base_agent",
		);
		expect(
			evaluationRecordInsertId({ ...record, evaluator: "other" } as never),
		).not.toBe(id);
		expect(
			evaluationRecordInsertId({ ...record, route: "kg_rag" } as never),
		).not.toBe(id);
	});
});

describe("contract against the real golden set", () => {
	test("every emitted metric belongs to the closed catalog", () => {
		const batch = runEvaluationGoldenSet();
		const emitted = new Set(
			batch.reports.flatMap((report) =>
				report.results.map((result) => result.metric),
			),
		);
		for (const metric of emitted) {
			expect(evaluationMetricNames as readonly string[]).toContain(metric);
		}
	});

	test("fixture IDs and versions fit the identifier shape", () => {
		for (const fixture of evaluationGoldens) {
			expect(
				telemetryIdentifierSchema.safeParse(fixture.fixtureId).success,
			).toBe(true);
			expect(
				telemetryIdentifierSchema.safeParse(fixture.policyVersion).success,
			).toBe(true);
			if (fixture.catalogVersion !== null) {
				expect(
					telemetryIdentifierSchema.safeParse(fixture.catalogVersion).success,
				).toBe(true);
			}
		}
	});

	test("every reason code fits the code shape", () => {
		const batch = runEvaluationGoldenSet();
		for (const report of batch.reports) {
			for (const result of report.results) {
				expect(
					result.reasonCode === null ||
						/^[a-z][a-z0-9_]{0,63}$/.test(result.reasonCode),
				).toBe(true);
			}
		}
	});
});
