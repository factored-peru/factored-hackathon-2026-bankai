import { createHash } from "node:crypto";

/**
 * Canonical SHA-256 over stable LLM inputs. Callers must pass already-sanitized
 * user text hashes — never raw PII-bearing prompts as the hash input payload
 * that gets logged; only digests appear in Valkey keys.
 */
export function hashLlmPromptParts(input: {
	modelId: string;
	system: string;
	userSanitized: string;
	toolsSchemaJson?: string;
	graphRunId?: string;
	catalogVersion?: string;
	temperature?: number;
	locale?: string;
}): string {
	const payload = {
		modelId: input.modelId,
		systemHash: sha(input.system),
		userHash: sha(input.userSanitized),
		toolsSchemaHash: sha(input.toolsSchemaJson ?? ""),
		graphRunId: input.graphRunId ?? "none",
		catalogVersion: input.catalogVersion ?? "none",
		temperature: input.temperature ?? null,
		locale: input.locale ?? null,
	};
	return sha(stableStringify(payload));
}

function sha(value: string): string {
	return createHash("sha256").update(value).digest("hex");
}

function stableStringify(value: unknown): string {
	return JSON.stringify(value, Object.keys(value as object).sort());
}
