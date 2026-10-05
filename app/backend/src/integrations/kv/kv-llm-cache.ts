import { createHash } from "node:crypto";
import { z } from "zod";
import type {
	CachedCompletion,
	LlmCacheKeyParts,
	LlmEphemeralCache,
} from "../../services/ports/llm-ephemeral-cache.js";
import type { KeyValueStore } from "./key-value-store.js";

const cachedCompletionSchema = z
	.object({
		text: z.string().min(1),
		model: z.string().min(1),
		createdAt: z.string().min(1),
		usage: z
			.object({
				inputTokens: z.number().int().nonnegative().optional(),
				outputTokens: z.number().int().nonnegative().optional(),
			})
			.strict()
			.optional(),
	})
	.strict();

export type KvLlmCacheOptions = Readonly<{
	keyPrefix: string;
	defaultTtlSeconds: number;
}>;

/**
 * Exact-match LLM response cache on the shared Memorystore instance.
 * Namespace: `{prefix}llm:resp:v1:{tenantHash}:{operation}:{model}:{promptHash}:{graph}:{catalog}`
 */
export class KvLlmCache implements LlmEphemeralCache {
	constructor(
		private readonly store: KeyValueStore,
		private readonly options: KvLlmCacheOptions,
	) {}

	async getExact(parts: LlmCacheKeyParts): Promise<CachedCompletion | null> {
		try {
			const raw = await this.store.get(this.key(parts));
			if (raw === null) return null;
			const parsed = cachedCompletionSchema.safeParse(JSON.parse(raw));
			if (!parsed.success) return null;
			const data = parsed.data;
			const usage =
				data.usage === undefined
					? undefined
					: {
							...(data.usage.inputTokens === undefined
								? {}
								: { inputTokens: data.usage.inputTokens }),
							...(data.usage.outputTokens === undefined
								? {}
								: { outputTokens: data.usage.outputTokens }),
						};
			return usage === undefined
				? {
						text: data.text,
						model: data.model,
						createdAt: data.createdAt,
					}
				: {
						text: data.text,
						model: data.model,
						createdAt: data.createdAt,
						usage,
					};
		} catch {
			return null;
		}
	}

	async setExact(
		parts: LlmCacheKeyParts,
		value: CachedCompletion,
		ttlSeconds: number,
	): Promise<void> {
		const ttl = ttlSeconds > 0 ? ttlSeconds : this.options.defaultTtlSeconds;
		const payload = cachedCompletionSchema.parse(value);
		await this.store.set(this.key(parts), JSON.stringify(payload), ttl);
	}

	private key(parts: LlmCacheKeyParts): string {
		const tenant = shortHash(parts.tenantId);
		const user = shortHash(parts.userId);
		const model = sanitizeSegment(parts.modelId);
		const graph = sanitizeSegment(parts.graphRunId);
		const catalog = sanitizeSegment(parts.catalogVersion);
		return `${this.options.keyPrefix}llm:resp:v1:${tenant}:${user}:${parts.operation}:${model}:${parts.promptHash}:${graph}:${catalog}`;
	}
}

function shortHash(value: string): string {
	return createHash("sha256").update(value).digest("base64url").slice(0, 24);
}

function sanitizeSegment(value: string): string {
	return value.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 128) || "none";
}

export class NoopLlmEphemeralCache implements LlmEphemeralCache {
	async getExact(_parts: LlmCacheKeyParts): Promise<CachedCompletion | null> {
		return null;
	}

	async setExact(
		_parts: LlmCacheKeyParts,
		_value: CachedCompletion,
		_ttlSeconds: number,
	): Promise<void> {}
}
