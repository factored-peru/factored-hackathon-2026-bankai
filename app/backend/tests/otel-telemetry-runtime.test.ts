import { afterEach, describe, expect, test } from "bun:test";
import { trace } from "@opentelemetry/api";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import {
	BasicTracerProvider,
	InMemorySpanExporter,
	SimpleSpanProcessor,
} from "@opentelemetry/sdk-trace-base";
import { buildLangfuseOtlpConfig } from "../src/integrations/observability/langfuse-otlp-config.js";
import { createTelemetryRuntime } from "../src/integrations/observability/otel-telemetry-runtime.js";
import { SanitizingSpanExporter } from "../src/integrations/observability/sanitizing-span-exporter.js";
import { BaseAgentEvaluator } from "../src/services/evaluation/base-agent-evaluator.js";
import { EvaluationRunner } from "../src/services/evaluation/evaluation-runner.js";
import { KnowledgeGraphRagEvaluator } from "../src/services/evaluation/knowledge-graph-rag-evaluator.js";
import { StructuredRagEvaluator } from "../src/services/evaluation/structured-rag-evaluator.js";
import { evaluationGoldens } from "./fixtures/evaluation-goldens.js";

const settings = {
	OTEL_ENABLED: true,
	APP_ENV: "dev" as const,
	LANGFUSE_BASE_URL: "https://us.cloud.langfuse.com",
	LANGFUSE_PUBLIC_KEY: "pk-lf-test-public",
	LANGFUSE_SECRET_KEY: "sk-lf-test-secret",
	TELEMETRY_CORRELATOR_KEY: "correlator-key-0123456789",
};

function runnerFor(
	runtime: NonNullable<ReturnType<typeof createTelemetryRuntime>>,
) {
	return new EvaluationRunner(
		new BaseAgentEvaluator(),
		[new StructuredRagEvaluator(), new KnowledgeGraphRagEvaluator()],
		runtime.evaluationTelemetry,
	);
}

describe("telemetry runtime", () => {
	test("creates nothing when telemetry is disabled", () => {
		expect(
			createTelemetryRuntime({ ...settings, OTEL_ENABLED: false }),
		).toBeNull();
	});

	test("exports one allowlisted span per fixture through the sanitizer", async () => {
		const memory = new InMemorySpanExporter();
		const runtime = createTelemetryRuntime(settings, {
			exporter: memory,
			matrixVersion: "p0-v1",
		});
		if (runtime === null) throw new Error("runtime expected");
		const runner = runnerFor(runtime);
		for (const fixture of evaluationGoldens) runner.run(fixture);
		await runtime.flush();
		const spans = memory.getFinishedSpans();
		expect(spans).toHaveLength(evaluationGoldens.length);
		expect(runtime.droppedSpans()).toBe(0);
		expect(runtime.evaluationTelemetry.droppedCount).toBe(0);
		for (const span of spans) {
			expect(span.name).toBe("evaluation");
			expect(span.attributes["eval.matrix_version"]).toBe("p0-v1");
			expect(span.resource.attributes["service.name"]).toBe("bankai-backend");
			expect(span.resource.attributes["deployment.environment.name"]).toBe(
				"dev",
			);
		}
		await runtime.shutdown();
	});

	test("the provider is isolated: it is never the global tracer", async () => {
		const memory = new InMemorySpanExporter();
		const runtime = createTelemetryRuntime(settings, { exporter: memory });
		if (runtime === null) throw new Error("runtime expected");
		trace.getTracer("somebody-else").startSpan("evaluation").end();
		await runtime.flush();
		expect(memory.getFinishedSpans()).toHaveLength(0);
		await runtime.shutdown();
	});
});

describe("sanitizing span exporter (last gate)", () => {
	function harness() {
		const memory = new InMemorySpanExporter();
		const gate = new SanitizingSpanExporter(memory);
		const provider = new BasicTracerProvider({
			resource: resourceFromAttributes({ "service.name": "bankai-backend" }),
			spanProcessors: [new SimpleSpanProcessor(gate)],
		});
		return { memory, gate, tracer: provider.getTracer("t") };
	}

	test("lets a contract-conforming span through", () => {
		const { memory, gate, tracer } = harness();
		const span = tracer.startSpan("model_armor");
		span.setAttributes({
			"bankai.span": "model_armor",
			"bankai.guardrail_status": "NO_MATCH_FOUND",
			"bankai.latency_ms": 12,
		});
		span.end();
		expect(memory.getFinishedSpans()).toHaveLength(1);
		expect(gate.droppedSpans).toBe(0);
	});

	test("drops spans that break the contract and never exports them", () => {
		const { memory, gate, tracer } = harness();
		const leaks: Array<(span: ReturnType<typeof tracer.startSpan>) => void> = [
			(span) => span.setAttribute("prompt", "give me my card number"),
			(span) => span.setAttribute("bankai.outcome", "free text with spaces"),
			(span) => span.setAttribute("bankai.unlisted", "x"),
			(span) => span.setAttribute("bankai.route", "llm\nmore"),
			(span) => span.addEvent("exception", { message: "stack with data" }),
			(span) => span.setStatus({ code: 2, message: "customer 4111 failed" }),
			(span) =>
				span.addLink({
					context: {
						traceId: "a".repeat(32),
						spanId: "b".repeat(16),
						traceFlags: 1,
					},
				}),
		];
		for (const leak of leaks) {
			const span = tracer.startSpan("policy");
			span.setAttribute("bankai.span", "policy");
			leak(span);
			span.end();
		}
		const badName = tracer.startSpan("GET /customers/123");
		badName.end();
		expect(memory.getFinishedSpans()).toHaveLength(0);
		expect(gate.droppedSpans).toBe(leaks.length + 1);
	});

	test("drops a span whose resource carries an unexpected attribute", () => {
		const memory = new InMemorySpanExporter();
		const gate = new SanitizingSpanExporter(memory);
		const provider = new BasicTracerProvider({
			resource: resourceFromAttributes({
				"service.name": "bankai-backend",
				"host.name": "internal-host",
			}),
			spanProcessors: [new SimpleSpanProcessor(gate)],
		});
		provider.getTracer("t").startSpan("policy").end();
		expect(memory.getFinishedSpans()).toHaveLength(0);
		expect(gate.droppedSpans).toBe(1);
	});
});

describe("OTLP wire format", () => {
	const saved = {
		headers: process.env.OTEL_EXPORTER_OTLP_HEADERS,
		endpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
	};
	afterEach(() => {
		for (const [key, value] of [
			["OTEL_EXPORTER_OTLP_HEADERS", saved.headers],
			["OTEL_EXPORTER_OTLP_ENDPOINT", saved.endpoint],
		] as const) {
			if (value === undefined) delete process.env[key];
			else process.env[key] = value;
		}
	});

	async function sendThroughLocalServer() {
		const received: {
			path: string;
			headers: Record<string, string>;
			body: string;
		}[] = [];
		const server = Bun.serve({
			port: 0,
			async fetch(request) {
				received.push({
					path: new URL(request.url).pathname,
					headers: Object.fromEntries(request.headers),
					body: await request.text(),
				});
				return new Response("{}", { status: 200 });
			},
		});
		try {
			const { headers } = buildLangfuseOtlpConfig(settings);
			const runtime = createTelemetryRuntime(settings, {
				matrixVersion: "p0-v1",
				exporter: new OTLPTraceExporter({
					url: `http://localhost:${server.port}/api/public/otel/v1/traces`,
					headers,
				}),
			});
			if (runtime === null) throw new Error("runtime expected");
			const runner = runnerFor(runtime);
			const fixture =
				evaluationGoldens[0] as (typeof evaluationGoldens)[number];
			runner.run(fixture);
			await runtime.flush();
			await runtime.shutdown();
			return { received, fixture };
		} finally {
			server.stop(true);
		}
	}

	test("sends allowlisted metadata with the Langfuse headers and no raw trace ID", async () => {
		const { received, fixture } = await sendThroughLocalServer();
		expect(received).toHaveLength(1);
		const request = received[0] as (typeof received)[number];
		expect(request.path).toBe("/api/public/otel/v1/traces");
		expect(request.headers.authorization).toStartWith("Basic ");
		expect(request.headers["x-langfuse-ingestion-version"]).toBe("4");
		expect(request.body).toContain(fixture.fixtureId);
		expect(request.body).not.toContain(fixture.traceId);
		expect(request.body).not.toContain(settings.LANGFUSE_SECRET_KEY);
	});

	test("refuses to start when ambient OTEL_EXPORTER_OTLP_* variables exist", () => {
		// The OTLP exporter would otherwise merge these into every request.
		process.env.OTEL_EXPORTER_OTLP_HEADERS = "x-ambient-leak=secret-value";
		process.env.OTEL_EXPORTER_OTLP_ENDPOINT = "https://collector.invalid";
		try {
			createTelemetryRuntime(settings, {
				exporter: new InMemorySpanExporter(),
			});
			throw new Error("expected a refusal");
		} catch (error) {
			const message = (error as Error).message;
			expect(message).toBe(
				"telemetry_ambient_otlp_env_unsupported:OTEL_EXPORTER_OTLP_ENDPOINT,OTEL_EXPORTER_OTLP_HEADERS",
			);
			expect(message).not.toContain("secret-value");
		}
	});

	test("ignores empty ambient variables and unrelated OTEL_ ones", () => {
		const runtime = createTelemetryRuntime(settings, {
			exporter: new InMemorySpanExporter(),
			ambientEnv: {
				OTEL_EXPORTER_OTLP_HEADERS: "",
				OTEL_SDK_DISABLED: "false",
			},
		});
		expect(runtime).not.toBeNull();
	});

	test("telemetry disabled never inspects the environment", () => {
		expect(
			createTelemetryRuntime(
				{ ...settings, OTEL_ENABLED: false },
				{ ambientEnv: { OTEL_EXPORTER_OTLP_HEADERS: "x=1" } },
			),
		).toBeNull();
	});

	test("an ambient OTEL_RESOURCE_ATTRIBUTES cannot add resource data to a span", async () => {
		process.env.OTEL_RESOURCE_ATTRIBUTES = "host.name=internal-host";
		try {
			const memory = new InMemorySpanExporter();
			const runtime = createTelemetryRuntime(settings, { exporter: memory });
			if (runtime === null) throw new Error("runtime expected");
			runnerFor(runtime).run(
				evaluationGoldens[0] as (typeof evaluationGoldens)[number],
			);
			await runtime.flush();
			for (const span of memory.getFinishedSpans()) {
				expect(span.resource.attributes["host.name"]).toBeUndefined();
			}
			await runtime.shutdown();
		} finally {
			delete process.env.OTEL_RESOURCE_ATTRIBUTES;
		}
	});
});
