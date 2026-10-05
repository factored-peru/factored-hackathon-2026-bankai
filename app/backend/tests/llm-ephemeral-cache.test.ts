import { describe, expect, test } from "bun:test";
import type { KeyValueStore } from "../src/integrations/kv/key-value-store.js";
import {
	KvLlmCache,
	NoopLlmEphemeralCache,
} from "../src/integrations/kv/kv-llm-cache.js";
import { hashLlmPromptParts } from "../src/services/llm/prompt-hash.js";

class FakeKv implements KeyValueStore {
	readonly values = new Map<string, { value: string; ttl: number }>();

	async hashSet(): Promise<void> {}
	async hashGetAll(): Promise<Record<string, string>> {
		return {};
	}
	async expire(): Promise<void> {}
	async delete(key: string): Promise<boolean> {
		return this.values.delete(key);
	}
	async get(key: string): Promise<string | null> {
		return this.values.get(key)?.value ?? null;
	}
	async set(key: string, value: string, ttlSeconds: number): Promise<void> {
		this.values.set(key, { value, ttl: ttlSeconds });
	}
	async setIfAbsent(): Promise<boolean> {
		return true;
	}
	async getAndDelete(): Promise<string | null> {
		return null;
	}
	isReady(): boolean {
		return true;
	}
	async close(): Promise<void> {}
}

const keyParts = {
	tenantId: "tenant-a",
	userId: "user-a",
	modelId: "gemini-2.0-flash",
	operation: "baseline" as const,
	promptHash: "abc123",
	graphRunId: "run-1",
	catalogVersion: "cat-1",
};

describe("KvLlmCache", () => {
	test("stores and returns sanitized completions under llm:resp namespace", async () => {
		const store = new FakeKv();
		const cache = new KvLlmCache(store, {
			keyPrefix: "agent:",
			defaultTtlSeconds: 600,
		});
		const completion = {
			text: "Tu producto está activo.",
			model: "gemini-2.0-flash",
			createdAt: "2026-10-04T00:00:00.000Z",
			usage: { inputTokens: 10, outputTokens: 4 },
		};

		await cache.setExact(keyParts, completion, 120);
		const hit = await cache.getExact(keyParts);

		expect(hit).toEqual(completion);
		const entries = [...store.values.entries()];
		expect(entries).toHaveLength(1);
		const [storedKey, stored] = entries[0] as [
			string,
			{ value: string; ttl: number },
		];
		expect(storedKey).toContain("agent:llm:resp:v1:");
		expect(storedKey).toContain(":baseline:");
		expect(storedKey).toContain(":abc123:");
		expect(stored.ttl).toBe(120);
		expect(stored.value).not.toContain("system");
	});

	test("isolates tenants and users", async () => {
		const store = new FakeKv();
		const cache = new KvLlmCache(store, {
			keyPrefix: "agent:",
			defaultTtlSeconds: 600,
		});
		await cache.setExact(
			keyParts,
			{
				text: "secret-a",
				model: "m",
				createdAt: "2026-10-04T00:00:00.000Z",
			},
			60,
		);

		expect(
			await cache.getExact({ ...keyParts, tenantId: "tenant-b" }),
		).toBeNull();
		expect(await cache.getExact({ ...keyParts, userId: "user-b" })).toBeNull();
	});

	test("misses when graph or catalog version changes", async () => {
		const store = new FakeKv();
		const cache = new KvLlmCache(store, {
			keyPrefix: "agent:",
			defaultTtlSeconds: 600,
		});
		await cache.setExact(
			keyParts,
			{
				text: "v1",
				model: "m",
				createdAt: "2026-10-04T00:00:00.000Z",
			},
			60,
		);

		expect(
			await cache.getExact({ ...keyParts, graphRunId: "run-2" }),
		).toBeNull();
		expect(
			await cache.getExact({ ...keyParts, catalogVersion: "cat-2" }),
		).toBeNull();
	});

	test("ignores corrupt payloads", async () => {
		const store = new FakeKv();
		const cache = new KvLlmCache(store, {
			keyPrefix: "agent:",
			defaultTtlSeconds: 600,
		});
		await cache.setExact(
			keyParts,
			{
				text: "ok",
				model: "m",
				createdAt: "2026-10-04T00:00:00.000Z",
			},
			60,
		);
		const keys = [...store.values.keys()];
		expect(keys).toHaveLength(1);
		const onlyKey = keys[0] as string;
		store.values.set(onlyKey, { value: "{not-json", ttl: 60 });
		expect(await cache.getExact(keyParts)).toBeNull();
	});

	test("noop cache never hits", async () => {
		const cache = new NoopLlmEphemeralCache();
		await cache.setExact(
			keyParts,
			{
				text: "x",
				model: "m",
				createdAt: "2026-10-04T00:00:00.000Z",
			},
			60,
		);
		expect(await cache.getExact(keyParts)).toBeNull();
	});
});

describe("hashLlmPromptParts", () => {
	test("is stable for the same sanitized inputs", () => {
		const a = hashLlmPromptParts({
			modelId: "m",
			system: "sys",
			userSanitized: "hola",
			toolsSchemaJson: '{"name":"t"}',
			graphRunId: "r1",
			catalogVersion: "c1",
		});
		const b = hashLlmPromptParts({
			modelId: "m",
			system: "sys",
			userSanitized: "hola",
			toolsSchemaJson: '{"name":"t"}',
			graphRunId: "r1",
			catalogVersion: "c1",
		});
		expect(a).toBe(b);
		expect(a).toHaveLength(64);
	});

	test("changes when user or catalog changes", () => {
		const base = {
			modelId: "m",
			system: "sys",
			userSanitized: "hola",
			catalogVersion: "c1",
		};
		const a = hashLlmPromptParts(base);
		expect(hashLlmPromptParts({ ...base, userSanitized: "adios" })).not.toBe(a);
		expect(hashLlmPromptParts({ ...base, catalogVersion: "c2" })).not.toBe(a);
	});
});
