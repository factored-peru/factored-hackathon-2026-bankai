import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { envSchema } from "../src/config/env.js";
import type {
	KeyValueStore,
	KeyValueStoreFactory,
} from "../src/integrations/kv/key-value-store.js";
import { KvPendingClarificationStore } from "../src/integrations/kv/kv-pending-clarification-store.js";
import { createSessionRuntime } from "../src/integrations/session-runtime.js";
import type { PendingClarification } from "../src/services/conversations/pending-clarification.js";

class FakeKv implements KeyValueStore {
	readonly values = new Map<string, string>();
	readonly ttls = new Map<string, number>();
	failing = false;

	private guard() {
		if (this.failing) throw new Error("kv_down");
	}
	async hashSet(): Promise<void> {}
	async hashGetAll(): Promise<Record<string, string>> {
		return {};
	}
	async expire(): Promise<void> {}
	async delete(): Promise<boolean> {
		return false;
	}
	async get(key: string): Promise<string | null> {
		this.guard();
		return this.values.get(key) ?? null;
	}
	async set(key: string, value: string, ttlSeconds: number): Promise<void> {
		this.guard();
		this.values.set(key, value);
		this.ttls.set(key, ttlSeconds);
	}
	async setIfAbsent(): Promise<boolean> {
		return true;
	}
	async getAndDelete(key: string): Promise<string | null> {
		this.guard();
		const value = this.values.get(key) ?? null;
		this.values.delete(key);
		return value;
	}
	isReady(): boolean {
		return true;
	}
	async close(): Promise<void> {}
}

const pending: PendingClarification = {
	original: "mis ultimos movimientos de la tarjeta",
	exchanges: [{ question: "¿Qué producto?", answer: "la visa" }],
	question: "¿Qué periodo?",
};

const key = "demo-bankai:user-1:thread-secreto";

function setup() {
	const kv = new FakeKv();
	const encryptionKey = randomBytes(32);
	const store = new KvPendingClarificationStore(kv, {
		keyPrefix: "bankai:",
		encryptionKey,
	});
	return { kv, store, encryptionKey };
}

describe("KvPendingClarificationStore", () => {
	test("round-trips a pending clarification", async () => {
		const { store } = setup();
		await store.put(key, pending);
		expect(await store.take(key)).toEqual(pending);
	});

	test("is used once: the second take finds nothing", async () => {
		const { store } = setup();
		await store.put(key, pending);
		await store.take(key);
		expect(await store.take(key)).toBeNull();
	});

	test("an absent key is null", async () => {
		expect(await setup().store.take("nobody")).toBeNull();
	});

	test("stores ciphertext under a hashed key, with a short TTL", async () => {
		const { kv, store } = setup();
		await store.put(key, pending);
		const stored = [...kv.values.entries()][0];
		const storedKey = stored?.[0] ?? "";
		const storedValue = stored?.[1] ?? "";
		expect(storedKey.startsWith("bankai:clarif:v1:")).toBe(true);
		expect(storedKey).not.toContain("thread-secreto");
		expect(storedKey).not.toContain("user-1");
		expect(storedValue).not.toContain("movimientos");
		expect(storedValue).not.toContain("visa");
		expect(kv.ttls.get(storedKey)).toBe(300);
	});

	test("a value encrypted with another key reads as nothing", async () => {
		const { kv, store } = setup();
		await store.put(key, pending);
		const other = new KvPendingClarificationStore(kv, {
			keyPrefix: "bankai:",
			encryptionKey: randomBytes(32),
		});
		expect(await other.take(key)).toBeNull();
	});

	test("a corrupted value reads as nothing", async () => {
		const { kv, store } = setup();
		await store.put(key, pending);
		const [storedKey] = [...kv.values.keys()];
		kv.values.set(storedKey ?? "", "not-an-encrypted-value");
		expect(await store.take(key)).toBeNull();
	});

	test("a KV outage never throws: the turn just starts over", async () => {
		const { kv, store } = setup();
		kv.failing = true;
		await expect(store.put(key, pending)).resolves.toBeUndefined();
		expect(await store.take(key)).toBeNull();
	});
});

describe("session runtime", () => {
	test("exposes the pending clarification store on the shared KV", async () => {
		const kv = new FakeKv();
		const factory: KeyValueStoreFactory = { connect: async () => kv };
		const runtime = await createSessionRuntime(
			envSchema.parse({
				KV_URL: "redis://kv.internal:6379",
				PRIVATE_DATA_ENCRYPTION_KEY: randomBytes(32).toString("base64url"),
			}),
			factory,
		);
		await runtime.pendingClarifications.put(key, pending);
		expect(kv.values.size).toBe(1);
		expect(await runtime.pendingClarifications.take(key)).toEqual(pending);
	});
});
