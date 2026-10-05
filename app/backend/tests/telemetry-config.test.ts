import { describe, expect, test } from "bun:test";
import { envSchema, validateRuntimeConfiguration } from "../src/config/env.js";
import { isLangfuseCloudUsUrl } from "../src/config/langfuse-destination.js";
import { buildLangfuseOtlpConfig } from "../src/integrations/observability/langfuse-otlp-config.js";

const enabled = {
	OTEL_ENABLED: true,
	LANGFUSE_ENABLED: true,
	LANGFUSE_PUBLIC_KEY: "pk-lf-test-public",
	LANGFUSE_SECRET_KEY: "sk-lf-test-secret",
	TELEMETRY_CORRELATOR_KEY: "correlator-key-0123456789",
};

function validate(values: Record<string, unknown>) {
	return validateRuntimeConfiguration(envSchema.parse(values));
}

describe("telemetry configuration", () => {
	test("is off by default and needs no keys", () => {
		const defaults = envSchema.parse({});
		expect(defaults.OTEL_ENABLED).toBe(false);
		expect(defaults.LANGFUSE_ENABLED).toBe(false);
		expect(defaults.TELEMETRY_CORRELATOR_KEY).toBe("");
		expect(() => validate({})).not.toThrow();
	});

	test("has no setting that could redirect spans to another endpoint", () => {
		const keys = Object.keys(envSchema.shape);
		expect(keys).not.toContain("OTEL_EXPORTER_OTLP_ENDPOINT");
		expect(keys).not.toContain("OTEL_EXPORTER_OTLP_HEADERS");
	});

	test("accepts a complete Langfuse Cloud US configuration", () => {
		expect(() => validate(enabled)).not.toThrow();
		expect(() =>
			validate({
				...enabled,
				LANGFUSE_BASE_URL: "https://us.cloud.langfuse.com/",
			}),
		).not.toThrow();
	});

	test("SVC-CORE-9017: both flags must be enabled together", () => {
		expect(() => validate({ ...enabled, LANGFUSE_ENABLED: false })).toThrow(
			"SVC-CORE-9017",
		);
		expect(() => validate({ ...enabled, OTEL_ENABLED: false })).toThrow(
			"SVC-CORE-9017",
		);
	});

	test("SVC-CORE-9018: keys and a strong correlator key are required", () => {
		for (const missing of [
			{ LANGFUSE_PUBLIC_KEY: "" },
			{ LANGFUSE_SECRET_KEY: "   " },
			{ TELEMETRY_CORRELATOR_KEY: "" },
			{ TELEMETRY_CORRELATOR_KEY: "too-short" },
		]) {
			expect(() => validate({ ...enabled, ...missing })).toThrow(
				"SVC-CORE-9018",
			);
		}
	});

	test("SVC-CORE-9019: only Langfuse Cloud US over https is allowed", () => {
		for (const url of [
			"https://eu.cloud.langfuse.com",
			"https://cloud.langfuse.com",
			"http://us.cloud.langfuse.com",
			"https://us.cloud.langfuse.com.evil.example",
			"https://evil.example/us.cloud.langfuse.com",
			"https://user:pass@us.cloud.langfuse.com",
			"https://us.cloud.langfuse.com:8443",
			"https://us.cloud.langfuse.com/api",
			"not a url",
			"",
		]) {
			expect(() => validate({ ...enabled, LANGFUSE_BASE_URL: url })).toThrow(
				"SVC-CORE-9019",
			);
		}
	});

	test("errors never echo a key", () => {
		try {
			validate({ ...enabled, LANGFUSE_BASE_URL: "https://evil.example" });
			throw new Error("expected a rejection");
		} catch (error) {
			const message = (error as Error).message;
			expect(message).not.toContain(enabled.LANGFUSE_SECRET_KEY);
			expect(message).not.toContain(enabled.TELEMETRY_CORRELATOR_KEY);
		}
	});
});

describe("Langfuse OTLP target", () => {
	const settings = {
		LANGFUSE_BASE_URL: "https://us.cloud.langfuse.com",
		LANGFUSE_PUBLIC_KEY: "pk-lf-test-public",
		LANGFUSE_SECRET_KEY: "sk-lf-test-secret",
	};

	test("uses the US traces endpoint, Basic auth and ingestion version 4", () => {
		const config = buildLangfuseOtlpConfig(settings);
		expect(config.url).toBe(
			"https://us.cloud.langfuse.com/api/public/otel/v1/traces",
		);
		expect(config.headers.Authorization).toBe(
			`Basic ${Buffer.from("pk-lf-test-public:sk-lf-test-secret").toString("base64")}`,
		);
		expect(config.headers["x-langfuse-ingestion-version"]).toBe("4");
	});

	test("normalizes a trailing slash", () => {
		expect(
			buildLangfuseOtlpConfig({
				...settings,
				LANGFUSE_BASE_URL: "https://us.cloud.langfuse.com/",
			}).url,
		).toBe("https://us.cloud.langfuse.com/api/public/otel/v1/traces");
	});

	test("refuses another host or missing credentials without echoing keys", () => {
		expect(() =>
			buildLangfuseOtlpConfig({
				...settings,
				LANGFUSE_BASE_URL: "https://eu.cloud.langfuse.com",
			}),
		).toThrow("langfuse_base_url_not_allowed");
		for (const blank of [
			{ LANGFUSE_PUBLIC_KEY: "" },
			{ LANGFUSE_SECRET_KEY: " " },
		]) {
			expect(() => buildLangfuseOtlpConfig({ ...settings, ...blank })).toThrow(
				"langfuse_credentials_missing",
			);
		}
	});

	test("destination check matches the configuration rule", () => {
		expect(isLangfuseCloudUsUrl("https://us.cloud.langfuse.com")).toBe(true);
		expect(isLangfuseCloudUsUrl("https://eu.cloud.langfuse.com")).toBe(false);
	});
});

describe("evaluation result persistence configuration", () => {
	const base = {
		BIGQUERY_ENABLED: true,
		GOOGLE_CLOUD_PROJECT: "factored-hackathon",
		GOOGLE_CLOUD_LOCATION: "us-central1",
		BIGQUERY_DATASET: "bankai_customer",
	};

	test("is off by default", () => {
		const defaults = envSchema.parse({});
		expect(defaults.BIGQUERY_EVAL_DATASET).toBe("");
		expect(defaults.BIGQUERY_EVAL_TABLE).toBe("evaluation_results");
		expect(() => validate({})).not.toThrow();
	});

	test("accepts a separate dataset when BigQuery is enabled", () => {
		expect(() =>
			validate({ ...base, BIGQUERY_EVAL_DATASET: "bankai_evaluation" }),
		).not.toThrow();
	});

	test("SVC-CORE-9020: needs BigQuery enabled and valid names", () => {
		expect(() =>
			validate({
				BIGQUERY_EVAL_DATASET: "bankai_evaluation",
				BIGQUERY_ENABLED: false,
			}),
		).toThrow("SVC-CORE-9020");
		for (const bad of [
			{ BIGQUERY_EVAL_DATASET: "bad dataset" },
			{ BIGQUERY_EVAL_DATASET: "a.b" },
			{ BIGQUERY_EVAL_TABLE: "bad-table;drop" },
			{ BIGQUERY_EVAL_TABLE: "" },
		]) {
			expect(() =>
				validate({
					...base,
					BIGQUERY_EVAL_DATASET: "bankai_evaluation",
					...bad,
				}),
			).toThrow("SVC-CORE-9020");
		}
	});

	test("SVC-CORE-9021: never shares the customer-data dataset", () => {
		expect(() =>
			validate({ ...base, BIGQUERY_EVAL_DATASET: "bankai_customer" }),
		).toThrow("SVC-CORE-9021");
	});
});
