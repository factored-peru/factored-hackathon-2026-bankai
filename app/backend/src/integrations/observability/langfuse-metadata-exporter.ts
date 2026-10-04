import {
	assertNoContentAttributes,
	type LangfuseAllowlistedAttributes,
} from "../../domain/observability/langfuse-allowlist.js";

export type LangfuseExporterConfig = Readonly<{
	otelEnabled: boolean;
	publicKey: string;
	secretKey: string;
	baseUrl: string;
}>;

/**
 * Metadata-only Langfuse sink (ADR 0012 / 0015).
 * Disabled by default: no SDK client, no network, no content export.
 * Activation (P0-33) requires OTEL_ENABLED and keys outside Git.
 */
export class DisabledLangfuseMetadataExporter {
	readonly status = "disabled" as const;

	constructor(private readonly config: LangfuseExporterConfig) {}

	isActive(): boolean {
		return (
			this.config.otelEnabled &&
			this.config.publicKey.length > 0 &&
			this.config.secretKey.length > 0
		);
	}

	async exportSpan(attributes: LangfuseAllowlistedAttributes): Promise<{
		status: "skipped" | "accepted";
		reason: string;
	}> {
		assertNoContentAttributes(attributes);
		if (!this.isActive()) {
			return {
				status: "skipped",
				reason: "otel_or_langfuse_credentials_disabled",
			};
		}
		// P0 keeps the SDK declared but idle until P0-33 wires OTLP safely.
		// Deliberately do not construct Langfuse() here to avoid accidental traffic.
		return {
			status: "skipped",
			reason: "langfuse_export_not_wired_pending_p0_33",
		};
	}
}

export function createLangfuseMetadataExporter(config: LangfuseExporterConfig) {
	return new DisabledLangfuseMetadataExporter(config);
}
