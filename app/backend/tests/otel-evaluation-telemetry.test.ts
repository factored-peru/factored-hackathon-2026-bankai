import { describe, expect, test } from "bun:test";
import type { Attributes, Counter, Meter } from "@opentelemetry/api";
import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import {
	forbiddenContentKeys,
	validateSpanAttributes,
} from "../src/domain/observability/telemetry-attributes.js";
import { OtelEvaluationTelemetry } from "../src/integrations/observability/otel-evaluation-telemetry.js";
import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import { EvaluationRunner } from "../src/services/evaluation/evaluation-runner.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";
import { createTraceCorrelator } from "../src/services/observability/trace-correlator.js";
import type { EvaluationTelemetry } from "../src/services/ports/evaluation-telemetry.js";
import { evaluationGoldens } from "./fixtures/evaluation-goldens.js";

const correlate = createTraceCorrelator("test-correlation-key-0001");

function setup() {
	const exporter = new InMemorySpanExporter();
	const provider = new BasicTracerProvider({
		spanProcessors: [new SimpleSpanProcessor(exporter)],
	});
	const points: { value: number; attributes: Attributes | undefined }[] = [];
	const counter = {
		add(value: number, attributes?: Attributes) {
			points.push({ value, attributes });
		},
	} as unknown as Counter;
	const meter = { createCounter: () => counter } as unknown as Meter;
	const telemetry = new OtelEvaluationTelemetry({
		tracer: provider.getTracer("bankai-test"),
		correlate,
		matrixVersion: "p0-v1",
		meter,
	});
	const runner = new EvaluationRunner(
		new BaseAgentEvaluator(),
		[new StructuredRagEvaluator(), new KnowledgeGraphRagEvaluator()],
		telemetry,
	);
	return { exporter, telemetry, runner, points };
}

describe("OTel evaluation telemetry", () => {
	test("emits exactly one allowlisted span per fixture, with route results", () => {
		const { exporter, telemetry, runner } = setup();
		for (const fixture of evaluationGoldens) runner.run(fixture);
		const spans = exporter.getFinishedSpans();
		expect(spans).toHaveLength(evaluationGoldens.length);
		expect(telemetry.droppedCount).toBe(0);
		for (const span of spans) {
			expect(span.name).toBe("evaluation");
			const attributes = span.attributes as Record<string, unknown>;
			expect(() => validateSpanAttributes(attributes)).not.toThrow();
			expect(attributes["bankai.span"]).toBe("evaluation");
		}
		// Route evaluators' metrics reach the span, which the old code never did.
		const routeMetrics = spans.flatMap((span) =>
			Object.keys(span.attributes).filter((key) =>
				/^eval\.(structured_catalog_and_evidence|kg_catalog_before_jev_and_evidence)\.score$/.test(
					key,
				),
			),
		);
		expect(routeMetrics.length).toBeGreaterThan(0);
	});

	test("no span exposes a raw trace ID or any content-like key", () => {
		const { exporter, runner } = setup();
		for (const fixture of evaluationGoldens) runner.run(fixture);
		for (const span of exporter.getFinishedSpans()) {
			const serialized = JSON.stringify(span.attributes);
			for (const fixture of evaluationGoldens) {
				expect(serialized).not.toContain(fixture.traceId);
			}
			for (const key of Object.keys(span.attributes)) {
				const segments = key.toLowerCase().split(".");
				for (const forbidden of forbiddenContentKeys) {
					expect(segments).not.toContain(forbidden);
				}
			}
		}
	});

	test("metric points are low cardinality and carry no IDs", () => {
		const { runner, points } = setup();
		for (const fixture of evaluationGoldens) runner.run(fixture);
		expect(points.length).toBeGreaterThan(0);
		const keys = new Set(
			points.flatMap((p) => Object.keys(p.attributes ?? {})),
		);
		expect([...keys].sort()).toEqual([
			"bankai.route",
			"eval.evaluator",
			"eval.evaluator_version",
			"eval.label",
			"eval.metric",
		]);
		expect(points.every((p) => p.value === 1)).toBe(true);
	});

	test("a contract breach drops the fixture instead of exporting a partial span", () => {
		const { exporter, telemetry, runner, points } = setup();
		const bad = {
			...(evaluationGoldens[0] as (typeof evaluationGoldens)[number]),
			fixtureId: "free text with spaces and customer data",
		};
		expect(() => runner.run(bad)).not.toThrow();
		expect(exporter.getFinishedSpans()).toHaveLength(0);
		expect(points).toHaveLength(0);
		expect(telemetry.droppedCount).toBe(1);
	});

	test("the runner ignores a telemetry sink that throws", () => {
		const exploding: EvaluationTelemetry = {
			record() {
				throw new Error("exporter down");
			},
		};
		const runner = new EvaluationRunner(
			new BaseAgentEvaluator(),
			[],
			exploding,
		);
		const fixture = evaluationGoldens[0] as (typeof evaluationGoldens)[number];
		expect(() => runner.run(fixture)).not.toThrow();
		expect(runner.run(fixture).results.length).toBeGreaterThan(0);
	});

	test("wiring telemetry does not change any evaluation result", () => {
		const evaluators = [
			new StructuredRagEvaluator(),
			new KnowledgeGraphRagEvaluator(),
		];
		const bare = new EvaluationRunner(new BaseAgentEvaluator(), evaluators);
		const { runner } = setup();
		for (const fixture of evaluationGoldens) {
			expect(runner.run(fixture)).toEqual(bare.run(fixture));
		}
	});
});
