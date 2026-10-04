import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const envBoolean = z.union([z.boolean(), z.stringbool()]);

export const envSchema = z.object({
	APP_NAME: z.string().min(1).default("base-bun-typescript-service"),
	APP_ENV: z.enum(["dev", "staging", "prod"]).default("dev"),
	CONFIG_FILE: z.string().default("config/settings.toml"),
	HOST: z.string().default("127.0.0.1"),
	PORT: z.coerce.number().int().positive().default(3000),
	LOG_LEVEL: z
		.enum(["fatal", "error", "warn", "info", "debug", "trace"])
		.default("info"),
	DATABASE_ENABLED: envBoolean.default(false),
	BUCKET_ENABLED: envBoolean.default(false),
	CACHE_ENABLED: envBoolean.default(false),
	SERVICE_TOKEN: z.string().default(""),

	// Browser identity and server-side session boundary.
	SESSION_COOKIE_NAME: z.string().default("__Host-session"),
	SESSION_STORE_ENABLED: envBoolean.default(false),
	KV_PROVIDER: z.enum(["valkey", "redis"]).default("valkey"),
	KV_URL: z.string().default(""),
	KV_USERNAME: z.string().default(""),
	KV_PASSWORD: z.string().default(""),
	KV_TLS: envBoolean.default(true),
	KV_KEY_PREFIX: z.string().default("agent:"),
	SESSION_TTL_SECONDS: z.coerce.number().int().positive().default(1800),
	HANDLE_TTL_SECONDS: z.coerce.number().int().positive().default(300),
	PRIVATE_DATA_ENCRYPTION_KEY: z.string().default(""),
	CSRF_SECRET: z.string().default(""),
	AUTH_ISSUER_URL: z.string().default(""),
	AUTH_AUDIENCE: z.string().default(""),
	AUTH_JWKS_URL: z.string().default(""),

	// Data stores. Credentials are environment-only and never TOML settings.
	DATABASE_URL: z.string().default(""),
	DATABASE_READONLY_URL: z.string().default(""),
	FIRESTORE_ENABLED: envBoolean.default(false),
	BIGQUERY_ENABLED: envBoolean.default(false),
	BIGQUERY_DATASET: z.string().default("hackathon"),
	BIGQUERY_JOB_TIMEOUT_MS: z.coerce
		.number()
		.int()
		.positive()
		.max(60_000)
		.default(30_000),
	STRUCTURED_CATALOG_PATH: z.string().default("config/structured-catalog.json"),
	GCS_ENABLED: envBoolean.default(false),
	GCS_GRAPH_ARTIFACT_PREFIX: z.string().default("knowledge-graph/"),
	CHAT_ENABLED: envBoolean.default(false),
	REALTIME_ENABLED: envBoolean.default(false),
	DEMO_AUTH_ENABLED: envBoolean.default(false),
	DEMO_ACTOR_HMAC_KEY: z.string().default(""),
	GCS_UPLOAD_BUCKET: z.string().default(""),
	GCS_UPLOAD_PREFIX: z.string().default("conversation-uploads/"),
	CHAT_MAX_ATTACHMENT_BYTES: z.coerce
		.number()
		.int()
		.positive()
		.default(10 * 1024 * 1024),
	CHAT_MAX_ATTACHMENTS: z.coerce.number().int().positive().max(3).default(3),

	// Google Cloud uses ADC/IAM for server-to-server calls, not an API key.
	GOOGLE_CLOUD_PROJECT: z.string().default(""),
	GOOGLE_CLOUD_LOCATION: z.string().default(""),
	GOOGLE_APPLICATION_CREDENTIALS: z.string().default(""),
	MODEL_ARMOR_ENABLED: envBoolean.default(false),
	MODEL_ARMOR_PROJECT_ID: z.string().default(""),
	MODEL_ARMOR_LOCATION: z.string().default(""),
	MODEL_ARMOR_INSPECT_TEMPLATE: z.string().default(""),
	MODEL_ARMOR_DEIDENTIFY_TEMPLATE: z.string().default(""),
	SDP_INSPECT_TEMPLATE: z.string().default(""),
	SDP_DEIDENTIFY_TEMPLATE: z.string().default(""),
	VERTEX_AI_ENABLED: envBoolean.default(false),
	VERTEX_AI_PROJECT_ID: z.string().default(""),
	VERTEX_AI_LOCATION: z.string().default(""),
	VERTEX_AI_MODEL: z.string().default(""),
	VERTEX_AI_API_ENDPOINT: z.string().default(""),

	// Optional model/tool providers. Keep each provider behind an adapter.
	JEV_ENABLED: envBoolean.default(false),
	JEV_BASE_URL: z.string().default(""),
	JEV_API_KEY: z.string().default(""),
	JEV_MODEL: z.string().default(""),
	OPENAI_ENABLED: envBoolean.default(false),
	OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
	OPENAI_API_KEY: z.string().default(""),
	OPENAI_MODEL: z.string().default(""),
	ANTHROPIC_ENABLED: envBoolean.default(false),
	ANTHROPIC_BASE_URL: z.string().default("https://api.anthropic.com"),
	ANTHROPIC_API_KEY: z.string().default(""),
	ANTHROPIC_MODEL: z.string().default(""),
	OPENROUTER_ENABLED: envBoolean.default(false),
	OPENROUTER_BASE_URL: z.string().default("https://openrouter.ai/api/v1"),
	OPENROUTER_API_KEY: z.string().default(""),
	OPENROUTER_MODEL: z.string().default(""),

	// Optional external PII detector and telemetry exporters.
	LOCAL_PII_DETECTOR_ENABLED: envBoolean.default(false),
	LOCAL_PII_DETECTOR_URL: z.string().default(""),
	LOCAL_PII_DETECTOR_API_KEY: z.string().default(""),
	OTEL_ENABLED: envBoolean.default(false),
	OTEL_EXPORTER_OTLP_ENDPOINT: z.string().default(""),
	OTEL_EXPORTER_OTLP_HEADERS: z.string().default(""),
	// HTTP and agent guardrails.
	CORS_ALLOWED_ORIGINS: z.string().default(""),
	TRUSTED_PROXY: z.string().default(""),
	MAX_BODY_BYTES: z.coerce.number().int().positive().default(1_048_576),
	REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
	RATE_LIMIT_PER_MINUTE: z.coerce.number().int().positive().default(60),
	AGENT_MAX_STEPS: z.coerce.number().int().positive().default(12),
	AGENT_MAX_TOOL_CALLS: z.coerce.number().int().positive().default(6),
	AGENT_MAX_LLM_CALLS: z.coerce.number().int().positive().default(8),
	AGENT_MAX_RETRIES_PER_NODE: z.coerce.number().int().nonnegative().default(2),
	AGENT_MAX_WALL_TIME_MS: z.coerce.number().int().positive().default(30_000),
	AGENT_MAX_RETRIEVED_CHUNKS: z.coerce.number().int().positive().default(8),
	AGENT_MAX_INPUT_TOKENS: z.coerce.number().int().nonnegative().default(0),
	AGENT_MAX_OUTPUT_TOKENS: z.coerce.number().int().nonnegative().default(0),
});

export type Env = z.infer<typeof envSchema>;

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

type TomlSettings = {
	app?: {
		name?: unknown;
		env?: unknown;
		host?: unknown;
		port?: unknown;
		log_level?: unknown;
		database_enabled?: unknown;
		bucket_enabled?: unknown;
		cache_enabled?: unknown;
		demo_auth_enabled?: unknown;
		realtime_enabled?: unknown;
		cors_allowed_origins?: unknown;
		session_cookie_name?: unknown;
	};
	profiles?: Record<string, TomlSettings>;
};

const profileEnvs = new Set(["dev", "staging", "prod"]);

export function resolveConfigFile(
	configFile = process.env.CONFIG_FILE,
): string {
	const path = configFile ?? "config/settings.toml";
	return path.startsWith("/") ? path : resolve(rootDir, path);
}

export function flattenTomlSettings(
	settings: TomlSettings,
): Record<string, unknown> {
	const app = settings.app ?? {};
	const selectedProfile =
		typeof process.env.APP_ENV === "string" &&
		profileEnvs.has(process.env.APP_ENV)
			? process.env.APP_ENV
			: typeof app.env === "string" && profileEnvs.has(app.env)
				? app.env
				: undefined;
	const profileApp =
		selectedProfile !== undefined
			? (settings.profiles?.[selectedProfile]?.app ?? {})
			: {};

	return {
		...(app.name !== undefined ? { APP_NAME: app.name } : {}),
		...(app.env !== undefined ? { APP_ENV: app.env } : {}),
		...(app.host !== undefined ? { HOST: app.host } : {}),
		...(app.port !== undefined ? { PORT: app.port } : {}),
		...(app.log_level !== undefined ? { LOG_LEVEL: app.log_level } : {}),
		...(app.database_enabled !== undefined
			? { DATABASE_ENABLED: app.database_enabled }
			: {}),
		...(app.bucket_enabled !== undefined
			? { BUCKET_ENABLED: app.bucket_enabled }
			: {}),
		...(app.cache_enabled !== undefined
			? { CACHE_ENABLED: app.cache_enabled }
			: {}),
		...(app.demo_auth_enabled !== undefined
			? { DEMO_AUTH_ENABLED: app.demo_auth_enabled }
			: {}),
		...(app.realtime_enabled !== undefined
			? { REALTIME_ENABLED: app.realtime_enabled }
			: {}),
		...(app.cors_allowed_origins !== undefined
			? { CORS_ALLOWED_ORIGINS: app.cors_allowed_origins }
			: {}),
		...(app.session_cookie_name !== undefined
			? { SESSION_COOKIE_NAME: app.session_cookie_name }
			: {}),
		...(profileApp.name !== undefined ? { APP_NAME: profileApp.name } : {}),
		...(profileApp.env !== undefined ? { APP_ENV: profileApp.env } : {}),
		...(profileApp.host !== undefined ? { HOST: profileApp.host } : {}),
		...(profileApp.port !== undefined ? { PORT: profileApp.port } : {}),
		...(profileApp.log_level !== undefined
			? { LOG_LEVEL: profileApp.log_level }
			: {}),
		...(profileApp.database_enabled !== undefined
			? { DATABASE_ENABLED: profileApp.database_enabled }
			: {}),
		...(profileApp.bucket_enabled !== undefined
			? { BUCKET_ENABLED: profileApp.bucket_enabled }
			: {}),
		...(profileApp.cache_enabled !== undefined
			? { CACHE_ENABLED: profileApp.cache_enabled }
			: {}),
		...(profileApp.demo_auth_enabled !== undefined
			? { DEMO_AUTH_ENABLED: profileApp.demo_auth_enabled }
			: {}),
		...(profileApp.realtime_enabled !== undefined
			? { REALTIME_ENABLED: profileApp.realtime_enabled }
			: {}),
		...(profileApp.cors_allowed_origins !== undefined
			? { CORS_ALLOWED_ORIGINS: profileApp.cors_allowed_origins }
			: {}),
		...(profileApp.session_cookie_name !== undefined
			? { SESSION_COOKIE_NAME: profileApp.session_cookie_name }
			: {}),
	};
}

export function loadTomlSettings(
	configFile = resolveConfigFile(),
): Record<string, unknown> {
	if (!existsSync(configFile)) {
		return {};
	}
	const parsed = Bun.TOML.parse(
		readFileSync(configFile, "utf8"),
	) as TomlSettings;
	return flattenTomlSettings(parsed);
}

export function loadEnv(): Env {
	return validateRuntimeConfiguration(
		envSchema.parse({
			...loadTomlSettings(),
			...process.env,
		}),
	);
}

export function validateRuntimeConfiguration(settings: Env): Env {
	if (
		(settings.APP_ENV === "staging" || settings.APP_ENV === "prod") &&
		settings.SERVICE_TOKEN.length === 0
	) {
		throw new Error(
			"SVC-CORE-9002: SERVICE_TOKEN is required in staging and prod",
		);
	}

	if (settings.DEMO_AUTH_ENABLED && settings.APP_ENV === "prod") {
		throw new Error("SVC-CORE-9006: DEMO_AUTH_ENABLED is forbidden in prod");
	}
	if (
		settings.DEMO_AUTH_ENABLED &&
		settings.BIGQUERY_ENABLED &&
		settings.DEMO_ACTOR_HMAC_KEY.length === 0
	) {
		throw new Error(
			"SVC-CORE-9009: DEMO_ACTOR_HMAC_KEY is required with BigQuery demo actors",
		);
	}
	if (settings.REALTIME_ENABLED && settings.CORS_ALLOWED_ORIGINS.length === 0) {
		throw new Error(
			"SVC-CORE-9007: REALTIME_ENABLED requires CORS_ALLOWED_ORIGINS",
		);
	}
	if (settings.CHAT_ENABLED && !settings.FIRESTORE_ENABLED) {
		throw new Error("SVC-CORE-9008: CHAT_ENABLED requires FIRESTORE_ENABLED");
	}

	if (settings.SESSION_STORE_ENABLED && settings.KV_URL.length === 0) {
		throw new Error(
			"SVC-CORE-9003: KV_URL is required when SESSION_STORE_ENABLED is true",
		);
	}

	if (
		settings.SESSION_STORE_ENABLED &&
		settings.PRIVATE_DATA_ENCRYPTION_KEY.length === 0
	) {
		throw new Error(
			"SVC-CORE-9005: PRIVATE_DATA_ENCRYPTION_KEY is required when SESSION_STORE_ENABLED is true",
		);
	}

	if (
		(settings.APP_ENV === "staging" || settings.APP_ENV === "prod") &&
		!settings.SESSION_COOKIE_NAME.startsWith("__Host-")
	) {
		throw new Error(
			"SVC-CORE-9004: production session cookie must use the __Host- prefix",
		);
	}

	return settings;
}

export const env = loadEnv();
