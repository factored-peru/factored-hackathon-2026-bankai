import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { envSchema } from "../src/config/env.js";
import type {
	KeyValueStore,
	KeyValueStoreFactory,
	KvConnectionConfig,
} from "../src/integrations/kv/key-value-store.js";
import { createSessionRuntime } from "../src/integrations/session-runtime.js";

class RuntimeStore implements KeyValueStore {
	closed = false;

	async hashSet(): Promise<void> {}
	async hashGetAll(): Promise<Record<string, string>> {
		return {};
	}
	async expire(): Promise<void> {}
	async delete(): Promise<boolean> {
		return false;
	}
	async get(): Promise<string | null> {
		return null;
	}
	async set(): Promise<void> {}
	async setIfAbsent(): Promise<boolean> {
		return true;
	}
	async getAndDelete(): Promise<string | null> {
		return null;
	}
	isReady(): boolean {
		return true;
	}
	async close(): Promise<void> {
		this.closed = true;
	}
}

class CapturingFactory implements KeyValueStoreFactory {
	config?: KvConnectionConfig;
	readonly store = new RuntimeStore();

	async connect(config: KvConnectionConfig): Promise<KeyValueStore> {
		this.config = config;
		return this.store;
	}
}

describe("session runtime", () => {
	test.each(["valkey", "redis"] as const)(
		"injects the %s provider through the key-value factory",
		async (provider) => {
			const settings = envSchema.parse({
				KV_PROVIDER: provider,
				KV_URL: "redis://kv.internal:6379",
				KV_USERNAME: "service",
				KV_PASSWORD: "secret",
				KV_TLS: true,
				PRIVATE_DATA_ENCRYPTION_KEY: randomBytes(32).toString("base64url"),
			});
			const factory = new CapturingFactory();

			const runtime = await createSessionRuntime(settings, factory);

			expect(factory.config).toEqual({
				provider,
				url: "redis://kv.internal:6379",
				username: "service",
				password: "secret",
				tls: true,
			});
			expect(runtime.isReady()).toBe(true);
			await runtime.close();
			expect(factory.store.closed).toBe(true);
		},
	);
});
