import { describe, expect, test } from "bun:test";
import { assertNoContentAttributes } from "../src/domain/observability/langfuse-allowlist.js";
import { createLangfuseMetadataExporter } from "../src/integrations/observability/langfuse-metadata-exporter.js";

describe("Langfuse metadata exporter", () => {
	test("stays inactive when OTEL is disabled even if keys exist", async () => {
		const exporter = createLangfuseMetadataExporter({
			otelEnabled: false,
			publicKey: "pk-test",
			secretKey: "sk-test",
			baseUrl: "https://us.cloud.langfuse.com",
		});
		expect(exporter.isActive()).toBe(false);
		const result = await exporter.exportSpan({
			traceId: "trace-a",
			spanName: "policy",
			outcome: "ALLOW",
			sessionHash: "s",
			tenantHash: "t",
		});
		expect(result).toEqual({
			status: "skipped",
			reason: "otel_or_langfuse_credentials_disabled",
		});
	});

	test("rejects content attributes before any export", () => {
		expect(() =>
			assertNoContentAttributes({
				traceId: "t",
				spanName: "llm",
				outcome: "ok",
				prompt: "leak",
			}),
		).toThrow(/langfuse_content_attribute_forbidden:prompt/);
	});

	test("keeps allowlisted metadata when credentials are present but unwired", async () => {
		const exporter = createLangfuseMetadataExporter({
			otelEnabled: true,
			publicKey: "pk-test",
			secretKey: "sk-test",
			baseUrl: "https://us.cloud.langfuse.com",
		});
		expect(exporter.isActive()).toBe(true);
		const result = await exporter.exportSpan({
			traceId: "trace-b",
			spanName: "model_armor",
			outcome: "NO_MATCH_FOUND",
			guardrailStatus: "NO_MATCH_FOUND",
			latencyMs: 12,
		});
		expect(result.status).toBe("skipped");
		expect(result.reason).toContain("p0_33");
	});
});
