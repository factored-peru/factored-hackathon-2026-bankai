import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	envSchema,
	flattenTomlSettings,
	loadTomlSettings,
	validateRuntimeConfiguration,
} from "../src/config/env.js";

describe("config file loading", () => {
	test("toml settings are flattened to env keys", () => {
		const values = flattenTomlSettings({
			app: {
				name: "custom-service",
				env: "staging",
				port: 9000,
				database_enabled: true,
				bucket_enabled: true,
				cache_enabled: true,
			},
		});

		const settings = envSchema.parse(values);

		expect(settings.APP_NAME).toBe("custom-service");
		expect(settings.APP_ENV).toBe("staging");
		expect(settings.PORT).toBe(9000);
		expect(settings.DATABASE_ENABLED).toBe(true);
		expect(settings.BUCKET_ENABLED).toBe(true);
		expect(settings.CACHE_ENABLED).toBe(true);
		expect(settings.SERVICE_TOKEN).toBe("");
		expect(settings.SESSION_COOKIE_NAME).toBe("__Host-session");
		expect(settings.KV_PROVIDER).toBe("valkey");
		expect(settings.KV_TLS).toBe(true);
		expect(settings.SESSION_TTL_SECONDS).toBe(1800);
		expect(settings.FIRESTORE_ENABLED).toBe(false);
		expect(settings.MODEL_ARMOR_ENABLED).toBe(false);
		expect(settings.JEV_API_KEY).toBe("");
		expect(settings.OPENAI_API_KEY).toBe("");
		expect(settings.AGENT_MAX_STEPS).toBe(12);
	});

	test("toml settings load from custom path", () => {
		const dir = mkdtempSync(join(tmpdir(), "bun-config-"));
		const configFile = join(dir, "settings.toml");
		writeFileSync(
			configFile,
			`
[app]
name = "custom-service"
env = "dev"
host = "0.0.0.0"
port = 9001
`,
		);

		const settings = envSchema.parse(loadTomlSettings(configFile));

		expect(settings.APP_NAME).toBe("custom-service");
		expect(settings.APP_ENV).toBe("dev");
		expect(settings.HOST).toBe("0.0.0.0");
		expect(settings.PORT).toBe(9001);
	});

	test("toml profile overrides base values", () => {
		const previousAppEnv = process.env.APP_ENV;
		process.env.APP_ENV = "prod";
		const values = flattenTomlSettings({
			app: {
				name: "custom-service",
				env: "dev",
				database_enabled: false,
			},
			profiles: {
				prod: {
					app: {
						env: "prod",
						database_enabled: true,
						log_level: "warn",
					},
				},
			},
		});

		if (previousAppEnv === undefined) {
			delete process.env.APP_ENV;
		} else {
			process.env.APP_ENV = previousAppEnv;
		}

		const settings = envSchema.parse(values);

		expect(settings.APP_ENV).toBe("prod");
		expect(settings.DATABASE_ENABLED).toBe(true);
		expect(settings.LOG_LEVEL).toBe("warn");
	});

	test("development profile can enable the self-contained browser demo", () => {
		const values = flattenTomlSettings({
			app: { env: "dev" },
			profiles: {
				dev: {
					app: {
						demo_auth_enabled: true,
						realtime_enabled: true,
						cors_allowed_origins: "http://localhost:3001,http://127.0.0.1:3001",
						session_cookie_name: "bankai-demo-session",
					},
				},
			},
		});
		const settings = envSchema.parse(values);

		expect(settings.DEMO_AUTH_ENABLED).toBe(true);
		expect(settings.REALTIME_ENABLED).toBe(true);
		expect(settings.CORS_ALLOWED_ORIGINS).toContain("localhost:3001");
		expect(settings.SESSION_COOKIE_NAME).toBe("bankai-demo-session");
	});

	test("production requires a service token", () => {
		const settings = envSchema.parse({ APP_ENV: "prod" });

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"SVC-CORE-9002",
		);
	});

	test("development may run without a service token", () => {
		const settings = envSchema.parse({ APP_ENV: "dev" });

		expect(validateRuntimeConfiguration(settings).SERVICE_TOKEN).toBe("");
	});

	test("parses boolean environment strings without treating false as true", () => {
		const settings = envSchema.parse({
			SESSION_STORE_ENABLED: "false",
			KV_TLS: "false",
			MODEL_ARMOR_ENABLED: "true",
		});

		expect(settings.SESSION_STORE_ENABLED).toBe(false);
		expect(settings.KV_TLS).toBe(false);
		expect(settings.MODEL_ARMOR_ENABLED).toBe(true);
	});

	test("enabled session store requires a key-value URL", () => {
		const settings = envSchema.parse({
			APP_ENV: "dev",
			SESSION_STORE_ENABLED: true,
		});

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"SVC-CORE-9003",
		);
	});

	test("enabled session store requires private data encryption key", () => {
		const settings = envSchema.parse({
			APP_ENV: "dev",
			SESSION_STORE_ENABLED: true,
			KV_URL: "redis://localhost:6379",
		});

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"SVC-CORE-9005",
		);
	});

	test("enabled LLM cache requires KV_URL", () => {
		const settings = envSchema.parse({
			APP_ENV: "dev",
			LLM_CACHE_ENABLED: true,
		});

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"SVC-CORE-9017",
		);
	});

	test("LLM cache defaults stay off", () => {
		const settings = envSchema.parse({});
		expect(settings.LLM_CACHE_ENABLED).toBe(false);
		expect(settings.LLM_CACHE_TTL_SECONDS).toBe(600);
	});

	test.each(["valkey", "redis"] as const)(
		"accepts the %s key-value provider",
		(provider) => {
			const settings = envSchema.parse({ KV_PROVIDER: provider });

			expect(settings.KV_PROVIDER).toBe(provider);
		},
	);

	test("rejects an unknown key-value provider", () => {
		expect(() => envSchema.parse({ KV_PROVIDER: "unknown" })).toThrow();
	});

	test("BigQuery defaults keep Structured RAG disabled and safe", () => {
		const settings = envSchema.parse({});

		expect(settings.BIGQUERY_ENABLED).toBe(false);
		expect(settings.BIGQUERY_DATASET).toBe("");
		expect(settings.BIGQUERY_JOB_TIMEOUT_MS).toBe(30_000);
		expect(settings.STRUCTURED_CATALOG_PATH).toBe(
			"config/structured-catalog.json",
		);
		expect(validateRuntimeConfiguration(settings)).toBe(settings);
	});

	test("enabled BigQuery names every missing or invalid setting", () => {
		const settings = envSchema.parse({ BIGQUERY_ENABLED: true });

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"SVC-CORE-9006: BIGQUERY_ENABLED requires valid GOOGLE_CLOUD_PROJECT, BIGQUERY_DATASET, GOOGLE_CLOUD_LOCATION",
		);
	});

	test("enabled BigQuery rejects names that could alter a qualified table", () => {
		const settings = envSchema.parse({
			BIGQUERY_ENABLED: true,
			GOOGLE_CLOUD_PROJECT: "proj",
			GOOGLE_CLOUD_LOCATION: "us-central1",
			BIGQUERY_DATASET: "data`; DROP",
		});

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"requires valid BIGQUERY_DATASET",
		);
	});

	test("enabled BigQuery accepts a complete configuration", () => {
		const settings = envSchema.parse({
			BIGQUERY_ENABLED: true,
			GOOGLE_CLOUD_PROJECT: "proj",
			GOOGLE_CLOUD_LOCATION: "us-central1",
			BIGQUERY_DATASET: "data",
		});

		expect(validateRuntimeConfiguration(settings)).toBe(settings);
	});

	test("enabled JEV names every missing setting and requires https", () => {
		expect(() =>
			validateRuntimeConfiguration(envSchema.parse({ JEV_ENABLED: true })),
		).toThrow(
			"SVC-CORE-9007: JEV_ENABLED requires valid JEV_BASE_URL, JEV_API_KEY, JEV_MODEL",
		);
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({
					JEV_ENABLED: true,
					JEV_BASE_URL: "http://api.example.test",
					JEV_API_KEY: "k",
					JEV_MODEL: "m",
				}),
			),
		).toThrow("JEV_BASE_URL (https)");
	});

	test("JEV defaults are conservative and disabled", () => {
		const settings = envSchema.parse({});

		expect(settings.JEV_ENABLED).toBe(false);
		expect(settings.JEV_MIN_CONFIDENCE).toBe(0.7);
		expect(settings.JEV_TIMEOUT_MS).toBe(10_000);
		expect(() => envSchema.parse({ JEV_MIN_CONFIDENCE: 1.5 })).toThrow();
	});

	test("enabled Vertex AI requires project, location and model", () => {
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({ VERTEX_AI_ENABLED: true }),
			),
		).toThrow(
			"SVC-CORE-9008: VERTEX_AI_ENABLED requires valid VERTEX_AI_PROJECT_ID, VERTEX_AI_LOCATION, VERTEX_AI_MODEL",
		);
		expect(
			validateRuntimeConfiguration(
				envSchema.parse({
					VERTEX_AI_ENABLED: true,
					VERTEX_AI_PROJECT_ID: "proj",
					VERTEX_AI_LOCATION: "us-central1",
					VERTEX_AI_MODEL: "some-model",
				}),
			).VERTEX_AI_ENABLED,
		).toBe(true);
	});

	test("rejects a BigQuery job timeout above one minute", () => {
		expect(() =>
			envSchema.parse({ BIGQUERY_JOB_TIMEOUT_MS: 120_000 }),
		).toThrow();
	});

	test("production sessions require the __Host cookie prefix", () => {
		const settings = envSchema.parse({
			APP_ENV: "prod",
			SERVICE_TOKEN: "service-token",
			SESSION_COOKIE_NAME: "session",
		});

		expect(() => validateRuntimeConfiguration(settings)).toThrow(
			"SVC-CORE-9004",
		);
	});

	test("local KG artifacts are opt-in, demo-tenant-only, and forbidden in prod", () => {
		expect(envSchema.parse({}).KG_RAG_LOCAL_ENABLED).toBe(false);
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({
					APP_ENV: "prod",
					SERVICE_TOKEN: "service-token",
					KG_RAG_LOCAL_ENABLED: true,
				}),
			),
		).toThrow("SVC-CORE-9012");
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({
					KG_RAG_LOCAL_ENABLED: true,
					KG_RAG_LOCAL_TENANT_ID: "foreign",
				}),
			),
		).toThrow("SVC-CORE-9013");
	});

	test("GCS KG bucket defaults empty and fails closed in prod without GCS_ENABLED", () => {
		const defaults = envSchema.parse({});
		expect(defaults.GCS_GRAPH_BUCKET).toBe("");
		expect(defaults.GCS_GRAPH_ARTIFACT_PREFIX).toBe("");
		expect(defaults.GCS_GRAPH_TENANT_ID).toBe("demo-bankai");
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({
					APP_ENV: "prod",
					SERVICE_TOKEN: "service-token",
					GCS_GRAPH_BUCKET: "kg-artifacts",
					GCS_ENABLED: false,
				}),
			),
		).toThrow("SVC-CORE-9014");
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({
					APP_ENV: "prod",
					SERVICE_TOKEN: "service-token",
					GCS_ENABLED: true,
					GCS_GRAPH_BUCKET: "kg-artifacts",
					KG_RAG_LOCAL_ENABLED: true,
				}),
			),
		).toThrow("SVC-CORE-9012");
		expect(() =>
			validateRuntimeConfiguration(
				envSchema.parse({
					GCS_GRAPH_BUCKET: "kg-artifacts",
					GCS_GRAPH_TENANT_ID: "   ",
				}),
			),
		).toThrow("SVC-CORE-9016");
		expect(
			validateRuntimeConfiguration(
				envSchema.parse({
					APP_ENV: "prod",
					SERVICE_TOKEN: "service-token",
					GCS_ENABLED: true,
					GCS_GRAPH_BUCKET: "kg-artifacts",
					GCS_GRAPH_TENANT_ID: "demo-bankai",
				}),
			).GCS_GRAPH_BUCKET,
		).toBe("kg-artifacts");
	});
});
