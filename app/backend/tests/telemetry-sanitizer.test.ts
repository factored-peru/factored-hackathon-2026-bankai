import { describe, expect, test } from "bun:test";
import { evaluationResultRecordSchema } from "../src/domain/observability/evaluation-result-record.js";
import {
	TelemetryAttributeError,
	validateMetricAttributes,
	validateSpanAttributes,
} from "../src/domain/observability/telemetry-attributes.js";
import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import type { EvaluationReport } from "../src/services/evaluation/contracts.js";
import { EvaluationRunner } from "../src/services/evaluation/evaluation-runner.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";
import {
	evaluationMetricAttributes,
	evaluationResultRecords,
	evaluationSpanAttributes,
} from "../src/services/observability/telemetry-sanitizer.js";
import { createTraceCorrelator } from "../src/services/observability/trace-correlator.js";
import { evaluationGoldens } from "./fixtures/evaluation-goldens.js";

const correlate = createTraceCorrelator("test-correlation-key-0001");
const runner = new EvaluationRunner(new BaseAgentEvaluator(), [
	new StructuredRagEvaluator(),
	new KnowledgeGraphRagEvaluator(),
]);
const run = {
	runId: "run-20261004-0001",
	matrixVersion: "p0-v1",
	recordedAt: new Date("2026-10-04T12:00:00.000Z"),
	correlate,
};

describe("trace correlator", () => {
	test("is a stable keyed pseudonym, never the raw trace ID", () => {
		const first = correlate("synthetic-route-llm-01");
		expect(first).toMatch(/^[a-f0-9]{32}$/);
		expect(correlate("synthetic-route-llm-01")).toBe(first);
		expect(first).not.toContain("synthetic");
		expect(correlate("another-trace")).not.toBe(first);
	});

	test("rotating the key cuts correlation", () => {
		const rotated = createTraceCorrelator("rotated-correlation-key-02");
		expect(rotated("t")).not.toBe(correlate("t"));
	});

	test("rejects a weak key without echoing it", () => {
		expect(() => createTraceCorrelator("short")).toThrow(
			"trace_correlator_key_too_short",
		);
	});
});

describe("telemetry sanitizer over the real golden set", () => {
	const contexts = evaluationGoldens.map((context) => ({
		context,
		report: runner.run(context),
	}));

	test("every fixture yields a valid span with the correlator, not the trace ID", () => {
		expect(contexts.length).toBeGreaterThan(0);
		for (const { context, report } of contexts) {
			const attributes = evaluationSpanAttributes(
				context,
				report,
				correlate,
				"p0-v1",
			);
			expect(attributes["bankai.span"]).toBe("evaluation");
			expect(attributes["bankai.correlator"]).toBe(correlate(context.traceId));
			expect(attributes["eval.fixture_id"]).toBe(context.fixtureId);
			expect(JSON.stringify(attributes)).not.toContain(context.traceId);
			// What the sanitizer produced must itself satisfy the contract.
			expect(() => validateSpanAttributes(attributes)).not.toThrow();
		}
	});

	test("span carries one score, label and reason code per result", () => {
		const { context, report } = contexts[0] as (typeof contexts)[number];
		const attributes = evaluationSpanAttributes(context, report, correlate);
		for (const result of report.results) {
			expect(attributes[`eval.${result.metric}.score`]).toBe(result.score);
			expect(attributes[`eval.${result.metric}.label`]).toBe(result.label);
			expect(attributes[`eval.${result.metric}.reason_code`]).toBe(
				result.reasonCode ?? "none",
			);
		}
	});

	test("metric attributes are low cardinality for every result", () => {
		for (const { context, report } of contexts) {
			for (const result of report.results) {
				const attributes = evaluationMetricAttributes(context, result);
				expect(Object.keys(attributes).sort()).toEqual([
					"bankai.route",
					"eval.evaluator",
					"eval.evaluator_version",
					"eval.label",
					"eval.metric",
				]);
				expect(() => validateMetricAttributes(attributes)).not.toThrow();
			}
		}
	});

	test("every result becomes a valid versioned BigQuery record", () => {
		for (const { context, report } of contexts) {
			const records = evaluationResultRecords(context, report, run);
			expect(records).toHaveLength(report.results.length);
			for (const record of records) {
				expect(evaluationResultRecordSchema.parse(record)).toEqual(record);
				expect(record.correlator).toBe(correlate(context.traceId));
				expect(record.gate).toBe("informational");
				expect(JSON.stringify(record)).not.toContain(context.traceId);
			}
		}
	});
});

describe("telemetry sanitizer fails closed", () => {
	const { context, report } = (() => {
		const base = evaluationGoldens[0] as (typeof evaluationGoldens)[number];
		return { context: base, report: runner.run(base) };
	})();

	test("rejects a fixture ID that is free text, without echoing it", () => {
		const leak = "customer said card 4111 1111";
		const bad = { ...context, fixtureId: leak };
		const badReport = { ...report, fixtureId: leak };
		for (const action of [
			() => evaluationSpanAttributes(bad, badReport, correlate),
			() => evaluationResultRecords(bad, badReport, run),
		]) {
			try {
				action();
				throw new Error("expected rejection");
			} catch (error) {
				expect(error).toBeInstanceOf(TelemetryAttributeError);
				expect((error as Error).message).not.toContain(leak);
			}
		}
	});

	test("rejects a metric outside the closed catalog", () => {
		const unknown: EvaluationReport = {
			...report,
			results: [
				{
					metric: "invented_metric",
					score: 1,
					passed: true,
					label: "pass",
					reasonCode: null,
					evaluator: "base_agent",
					evaluatorVersion: "v1",
					mode: "deterministic",
				},
			],
		};
		expect(() => evaluationSpanAttributes(context, unknown, correlate)).toThrow(
			TelemetryAttributeError,
		);
		expect(() => evaluationResultRecords(context, unknown, run)).toThrow(
			TelemetryAttributeError,
		);
	});

	test("rejects a reason code that is free text", () => {
		const leaky: EvaluationReport = {
			...report,
			results: [
				{
					...(report.results[0] as EvaluationReport["results"][number]),
					reasonCode: "Customer Jane Doe asked about card",
				},
			],
		};
		expect(() => evaluationSpanAttributes(context, leaky, correlate)).toThrow(
			TelemetryAttributeError,
		);
	});
});
