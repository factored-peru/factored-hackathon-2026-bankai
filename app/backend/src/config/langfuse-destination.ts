/**
 * The only telemetry destination ADR 0012 allows: Langfuse Cloud, US region.
 * Kept apart from `env.ts` (which loads the environment on import) so both the
 * configuration check and the exporter share one rule.
 */
export const LANGFUSE_CLOUD_US_HOST = "us.cloud.langfuse.com";

export function isLangfuseCloudUsUrl(value: string): boolean {
	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			url.hostname === LANGFUSE_CLOUD_US_HOST &&
			url.port === "" &&
			url.username === "" &&
			url.password === "" &&
			url.pathname === "/" &&
			url.search === "" &&
			url.hash === ""
		);
	} catch {
		return false;
	}
}
