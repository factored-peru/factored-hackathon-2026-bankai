/** Ephemeral LLM completion cache (Valkey). Never stores raw prompts or evidence. */

export type LlmCacheOperation = "baseline" | "rag";

export type LlmCacheKeyParts = Readonly<{
	tenantId: string;
	/** Session subject; required so answers never cross customers. */
	userId: string;
	modelId: string;
	operation: LlmCacheOperation;
	promptHash: string;
	/** KG publication run id or "none". */
	graphRunId: string;
	/** Structured/KG catalog version or "none". */
	catalogVersion: string;
}>;

export type CachedCompletion = Readonly<{
	text: string;
	model: string;
	createdAt: string;
	usage?: Readonly<{
		inputTokens?: number;
		outputTokens?: number;
	}>;
}>;

export interface LlmEphemeralCache {
	getExact(parts: LlmCacheKeyParts): Promise<CachedCompletion | null>;
	setExact(
		parts: LlmCacheKeyParts,
		value: CachedCompletion,
		ttlSeconds: number,
	): Promise<void>;
}
