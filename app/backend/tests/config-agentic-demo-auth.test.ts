import { describe, expect, test } from "bun:test";
import { envSchema, validateRuntimeConfiguration } from "../src/config/env.js";

const agenticInfrastructure = {
	CHAT_PIPELINE: "control_plane",
	AGENTIC_CHAT_ENABLED: true,
	CHAT_ENABLED: true,
	REALTIME_ENABLED: true,
	FIRESTORE_ENABLED: true,
	SESSION_STORE_ENABLED: true,
	KV_URL: "redis://127.0.0.1:6379",
	PRIVATE_DATA_ENCRYPTION_KEY: "a".repeat(32),
	BIGQUERY_ENABLED: true,
	GOOGLE_CLOUD_PROJECT: "proj",
	GOOGLE_CLOUD_LOCATION: "us-central1",
	BIGQUERY_DATASET: "dataset",
	JEV_ENABLED: true,
	JEV_BASE_URL: "https://jev.example.test",
	JEV_API_KEY: "jev-key",
	JEV_MODEL: "jev-model",
	VERTEX_AI_ENABLED: true,
	VERTEX_AI_PROJECT_ID: "proj",
	VERTEX_AI_LOCATION: "us-central1",
	VERTEX_AI_MODEL: "model",
	MODEL_ARMOR_ENABLED: true,
	MODEL_ARMOR_PROJECT_ID: "proj",
	MODEL_ARMOR_LOCATION: "us-central1",
	MODEL_ARMOR_INSPECT_TEMPLATE:
		"projects/proj/locations/us-central1/templates/inspect",
	GCS_ENABLED: true,
	CORS_ALLOWED_ORIGINS: "http://localhost:3001",
	DEMO_AUTH_ENABLED: true,
	DEMO_ACTOR_HMAC_KEY: "k".repeat(32),
	SERVICE_TOKEN: "s".repeat(32),
};

const validate = (overrides: Record<string, unknown>) =>
	validateRuntimeConfiguration(
		envSchema.parse({ ...agenticInfrastructure, ...overrides }),
	);

describe("agentic chat with the demo login (ADR 0022)", () => {
	test("is allowed in dev and staging", () => {
		expect(() => validate({ APP_ENV: "dev" })).not.toThrow();
		expect(() => validate({ APP_ENV: "staging" })).not.toThrow();
	});

	test("is refused in prod", () => {
		expect(() => validate({ APP_ENV: "prod" })).toThrow("SVC-CORE-9006");
	});

	test("still requires the real infrastructure flags", () => {
		expect(() =>
			validate({ APP_ENV: "dev", MODEL_ARMOR_ENABLED: false }),
		).toThrow("SVC-CORE-9010");
	});
});
