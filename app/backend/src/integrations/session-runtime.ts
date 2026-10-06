import type { Env } from "../config/env.js";
import type { PrivateDataBroker, SessionStore } from "../domain/session.js";
import type { PendingClarificationStore } from "../services/conversations/pending-clarification.js";
import type { LlmEphemeralCache } from "../services/ports/llm-ephemeral-cache.js";
import type {
	KeyValueStore,
	KeyValueStoreFactory,
} from "./kv/key-value-store.js";
import { KvLlmCache, NoopLlmEphemeralCache } from "./kv/kv-llm-cache.js";
import { KvPendingClarificationStore } from "./kv/kv-pending-clarification-store.js";
import {
	KvPrivateDataBroker,
	privateDataEncryptionKeyFromConfig,
} from "./kv/kv-private-data-broker.js";
import { KvSessionStore } from "./kv/kv-session-store.js";
import { RespKeyValueStoreFactory } from "./kv/resp-key-value-store.js";

export type SessionRuntime = Readonly<{
	sessionStore: SessionStore;
	privateDataBroker: PrivateDataBroker;
	llmCache: LlmEphemeralCache;
	/** Query a thread waits to finish after the assistant asked for more data. */
	pendingClarifications: PendingClarificationStore;
	isReady(): boolean;
	close(): Promise<void>;
}>;

export type LlmCacheRuntime = Readonly<{
	llmCache: LlmEphemeralCache;
	isReady(): boolean;
	close(): Promise<void>;
}>;

type KvSettings = Pick<
	Env,
	| "KV_PROVIDER"
	| "KV_URL"
	| "KV_USERNAME"
	| "KV_PASSWORD"
	| "KV_TLS"
	| "KV_KEY_PREFIX"
	| "SESSION_TTL_SECONDS"
	| "HANDLE_TTL_SECONDS"
	| "PRIVATE_DATA_ENCRYPTION_KEY"
	| "LLM_CACHE_ENABLED"
	| "LLM_CACHE_TTL_SECONDS"
>;

export async function createSessionRuntime(
	settings: KvSettings,
	factory: KeyValueStoreFactory = new RespKeyValueStoreFactory(),
): Promise<SessionRuntime> {
	const encryptionKey = privateDataEncryptionKeyFromConfig(
		settings.PRIVATE_DATA_ENCRYPTION_KEY,
	);
	const store = await connectKv(settings, factory);

	const sessionStore = new KvSessionStore(store, {
		keyPrefix: settings.KV_KEY_PREFIX,
		ttlSeconds: settings.SESSION_TTL_SECONDS,
	});
	const privateDataBroker = new KvPrivateDataBroker(store, {
		keyPrefix: settings.KV_KEY_PREFIX,
		defaultTtlSeconds: settings.HANDLE_TTL_SECONDS,
		encryptionKey,
	});

	return {
		sessionStore,
		privateDataBroker,
		llmCache: createLlmCache(store, settings),
		pendingClarifications: new KvPendingClarificationStore(store, {
			keyPrefix: settings.KV_KEY_PREFIX,
			encryptionKey,
		}),
		isReady: () => store.isReady(),
		close: () => store.close(),
	};
}

/**
 * LLM exact-match cache on the shared Memorystore URL when sessions are off.
 * Prefer {@link createSessionRuntime} so one RESP client owns both namespaces.
 */
export async function createLlmCacheRuntime(
	settings: Pick<
		Env,
		| "LLM_CACHE_ENABLED"
		| "LLM_CACHE_TTL_SECONDS"
		| "KV_PROVIDER"
		| "KV_URL"
		| "KV_USERNAME"
		| "KV_PASSWORD"
		| "KV_TLS"
		| "KV_KEY_PREFIX"
	>,
	factory: KeyValueStoreFactory = new RespKeyValueStoreFactory(),
): Promise<LlmCacheRuntime> {
	if (!settings.LLM_CACHE_ENABLED) {
		return {
			llmCache: new NoopLlmEphemeralCache(),
			isReady: () => true,
			close: async () => {},
		};
	}
	const store = await connectKv(settings, factory);
	return {
		llmCache: createLlmCache(store, settings),
		isReady: () => store.isReady(),
		close: () => store.close(),
	};
}

function createLlmCache(
	store: KeyValueStore,
	settings: Pick<
		Env,
		"LLM_CACHE_ENABLED" | "LLM_CACHE_TTL_SECONDS" | "KV_KEY_PREFIX"
	>,
): LlmEphemeralCache {
	if (!settings.LLM_CACHE_ENABLED) {
		return new NoopLlmEphemeralCache();
	}
	return new KvLlmCache(store, {
		keyPrefix: settings.KV_KEY_PREFIX,
		defaultTtlSeconds: settings.LLM_CACHE_TTL_SECONDS,
	});
}

async function connectKv(
	settings: Pick<
		Env,
		"KV_PROVIDER" | "KV_URL" | "KV_USERNAME" | "KV_PASSWORD" | "KV_TLS"
	>,
	factory: KeyValueStoreFactory,
): Promise<KeyValueStore> {
	return factory.connect({
		provider: settings.KV_PROVIDER,
		url: settings.KV_URL,
		username: settings.KV_USERNAME,
		password: settings.KV_PASSWORD,
		tls: settings.KV_TLS,
	});
}
