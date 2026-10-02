import type { Env } from "../config/env.js";
import type { PrivateDataBroker, SessionStore } from "../domain/session.js";
import type { KeyValueStoreFactory } from "./kv/key-value-store.js";
import {
	KvPrivateDataBroker,
	privateDataEncryptionKeyFromConfig,
} from "./kv/kv-private-data-broker.js";
import { KvSessionStore } from "./kv/kv-session-store.js";
import { RespKeyValueStoreFactory } from "./kv/resp-key-value-store.js";

export type SessionRuntime = Readonly<{
	sessionStore: SessionStore;
	privateDataBroker: PrivateDataBroker;
	isReady(): boolean;
	close(): Promise<void>;
}>;

export async function createSessionRuntime(
	settings: Pick<
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
	>,
	factory: KeyValueStoreFactory = new RespKeyValueStoreFactory(),
): Promise<SessionRuntime> {
	const encryptionKey = privateDataEncryptionKeyFromConfig(
		settings.PRIVATE_DATA_ENCRYPTION_KEY,
	);
	const store = await factory.connect({
		provider: settings.KV_PROVIDER,
		url: settings.KV_URL,
		username: settings.KV_USERNAME,
		password: settings.KV_PASSWORD,
		tls: settings.KV_TLS,
	});

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
		isReady: () => store.isReady(),
		close: () => store.close(),
	};
}
