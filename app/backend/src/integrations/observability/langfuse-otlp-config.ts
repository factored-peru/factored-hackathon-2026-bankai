import type { Env } from "../../config/env.js";
import { isLangfuseCloudUsUrl } from "../../config/langfuse-destination.js";

export type LangfuseOtlpConfig = Readonly<{
	url: string;
	headers: Readonly<Record<string, string>>;
}>;

/**
 * OTLP/HTTP target for Langfuse Cloud US. `x-langfuse-ingestion-version: 4`
 * makes spans show up in real time on the v4 data model. The result carries
 * credentials: it is handed to the exporter and never logged or serialized.
 */
export function buildLangfuseOtlpConfig(
	settings: Pick<
		Env,
		"LANGFUSE_BASE_URL" | "LANGFUSE_PUBLIC_KEY" | "LANGFUSE_SECRET_KEY"
	>,
): LangfuseOtlpConfig {
	if (!isLangfuseCloudUsUrl(settings.LANGFUSE_BASE_URL)) {
		throw new Error("langfuse_base_url_not_allowed");
	}
	if (
		settings.LANGFUSE_PUBLIC_KEY.trim().length === 0 ||
		settings.LANGFUSE_SECRET_KEY.trim().length === 0
	) {
		throw new Error("langfuse_credentials_missing");
	}
	const credentials = Buffer.from(
		`${settings.LANGFUSE_PUBLIC_KEY}:${settings.LANGFUSE_SECRET_KEY}`,
	).toString("base64");
	return {
		url: `${new URL(settings.LANGFUSE_BASE_URL).origin}/api/public/otel/v1/traces`,
		headers: {
			Authorization: `Basic ${credentials}`,
			"x-langfuse-ingestion-version": "4",
		},
	};
}
