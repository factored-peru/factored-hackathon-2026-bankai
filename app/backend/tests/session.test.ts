import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import type { SessionContext } from "../src/domain/session.js";
import type { KeyValueStore } from "../src/integrations/kv/key-value-store.js";
import { KvPrivateDataBroker } from "../src/integrations/kv/kv-private-data-broker.js";
import { KvSessionStore } from "../src/integrations/kv/kv-session-store.js";
import { PrivateToolResolutionService } from "../src/services/private-tool-resolution.js";
import { SessionBoundArgumentResolver } from "../src/services/tools/session-bound-argument-resolver.js";

class FakeKeyValueStore implements KeyValueStore {
	private readonly hashes = new Map<string, Record<string, string>>();
	private readonly values = new Map<string, string>();

	async hashSet(key: string, values: Record<string, string>): Promise<void> {
		this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...values });
	}

	async hashGetAll(key: string): Promise<Record<string, string>> {
		return { ...(this.hashes.get(key) ?? {}) };
	}

	async expire(_key: string, _seconds: number): Promise<void> {
		return;
	}

	async delete(key: string): Promise<boolean> {
		return this.hashes.delete(key) || this.values.delete(key);
	}

	async get(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}

	async set(key: string, value: string, _ttlSeconds: number): Promise<void> {
		this.values.set(key, value);
	}

	async setIfAbsent(
		key: string,
		value: string,
		_ttlSeconds: number,
	): Promise<boolean> {
		if (this.values.has(key)) {
			return false;
		}
		this.values.set(key, value);
		return true;
	}

	async getAndDelete(key: string): Promise<string | null> {
		const value = this.values.get(key) ?? null;
		this.values.delete(key);
		return value;
	}

	isReady(): boolean {
		return true;
	}

	async close(): Promise<void> {
		return;
	}
}

function context(overrides: Partial<SessionContext> = {}): SessionContext {
	return {
		sessionId: "session-a",
		userId: "user-a",
		tenantId: "tenant-a",
		scopes: ["agent:read"],
		roles: ["customer"],
		capabilities: ["movements:read"],
		sessionVersion: 1,
		createdAt: "2026-01-01T00:00:00.000Z",
		lastSeenAt: "2026-01-01T00:00:00.000Z",
		expiresAt: "2026-01-01T00:30:00.000Z",
		revokedAt: null,
		...overrides,
	};
}

describe("key-value session boundary", () => {
	test("stores an opaque session and rotates its version", async () => {
		const storeClient = new FakeKeyValueStore();
		let now = new Date("2026-01-01T00:00:00.000Z");
		const store = new KvSessionStore(storeClient, {
			keyPrefix: "test:",
			ttlSeconds: 1800,
			now: () => now,
		});

		const created = await store.create({
			userId: "user-a",
			tenantId: "tenant-a",
			scopes: ["agent:read"],
			roles: ["customer"],
			capabilities: ["movements:read"],
		});
		expect(created.sessionId).not.toContain("user-a");
		expect((await store.get(created.sessionId))?.tenantId).toBe("tenant-a");

		now = new Date("2026-01-01T00:01:00.000Z");
		const rotated = await store.rotate(created.sessionId);
		expect(rotated.sessionId).not.toBe(created.sessionId);
		expect(rotated.sessionVersion).toBe(2);
		expect(await store.get(created.sessionId)).toBeNull();
	});

	test("encrypts private values and consumes single-use handles", async () => {
		const store = new FakeKeyValueStore();
		const broker = new KvPrivateDataBroker(store, {
			keyPrefix: "test:",
			encryptionKey: randomBytes(32),
			defaultTtlSeconds: 300,
		});
		const session = context();
		const handle = await broker.mintHandle({
			session,
			toolId: "get_employee_movements",
			audience: "tool-executor",
			purpose: "answer-user",
			value: { accountReference: "private-account-ref" },
			expiresInSeconds: 120,
			singleUse: true,
		});

		expect(handle).not.toContain("private-account-ref");
		await expect(
			broker.resolveHandle({
				session: context({ sessionId: "session-b" }),
				handle,
				toolId: "get_employee_movements",
				audience: "tool-executor",
				purpose: "answer-user",
			}),
		).rejects.toThrow("absent");

		expect(
			await broker.resolveHandle({
				session,
				handle,
				toolId: "get_employee_movements",
				audience: "tool-executor",
				purpose: "answer-user",
			}),
		).toEqual({ accountReference: "private-account-ref" });
		await expect(
			broker.resolveHandle({
				session,
				handle,
				toolId: "get_employee_movements",
				audience: "tool-executor",
				purpose: "answer-user",
			}),
		).rejects.toThrow("absent");

		await expect(
			broker.mintHandle({
				session,
				toolId: "get_employee_movements",
				audience: "tool-executor",
				purpose: "answer-user",
				value: { accountReference: "private-account-ref" },
				expiresInSeconds: 120,
				singleUse: false,
			}),
		).rejects.toThrow("single-use");
	});

	test("reloads the session before resolving a handle", async () => {
		const store = new FakeKeyValueStore();
		const sessionStore = new KvSessionStore(store, {
			keyPrefix: "test:",
			ttlSeconds: 1800,
		});
		const session = await sessionStore.create({
			userId: "user-a",
			tenantId: "tenant-a",
			scopes: ["agent:read"],
			roles: ["customer"],
			capabilities: ["movements:read"],
		});
		const broker = new KvPrivateDataBroker(store, {
			keyPrefix: "test:",
			encryptionKey: randomBytes(32),
			defaultTtlSeconds: 300,
		});
		const handle = await broker.mintHandle({
			session,
			toolId: "get_employee_movements",
			audience: "tool-executor",
			purpose: "answer-user",
			value: { accountReference: "private-account-ref" },
			expiresInSeconds: 120,
			singleUse: true,
		});
		const resolver = new PrivateToolResolutionService(sessionStore, broker);

		await sessionStore.revoke(session.sessionId, "logout");
		await expect(
			resolver.resolve({
				sessionId: session.sessionId,
				handle,
				toolId: "get_employee_movements",
				audience: "tool-executor",
				purpose: "answer-user",
			}),
		).rejects.toThrow("valid session");
	});

	test("resolves only statically bound tool arguments against the current session", async () => {
		const store = new FakeKeyValueStore();
		const sessionStore = new KvSessionStore(store, {
			keyPrefix: "test:",
			ttlSeconds: 1800,
		});
		const currentSession = await sessionStore.create({
			userId: "user-a",
			tenantId: "tenant-a",
			scopes: [],
			roles: ["customer"],
			capabilities: ["movements:read"],
		});
		const broker = new KvPrivateDataBroker(store, {
			keyPrefix: "test:",
			encryptionKey: randomBytes(32),
			defaultTtlSeconds: 300,
		});
		const handle = await broker.mintHandle({
			session: currentSession,
			toolId: "get_movements",
			audience: "tool-executor",
			purpose: "answer-user",
			value: "private-account-id",
			expiresInSeconds: 120,
			singleUse: true,
		});
		const resolver = new SessionBoundArgumentResolver(
			[
				{
					toolId: "get_movements",
					version: "1",
					bindings: [
						{
							argumentName: "accountRef",
							purpose: "answer-user",
							audience: "tool-executor",
						},
					],
				},
			],
			sessionStore,
			broker,
		);

		expect(
			await resolver.resolve({
				definition: {
					id: "get_movements",
					version: "1",
					capability: "movements:read",
					sideEffect: "none",
					risk: "low",
					idempotency: "none",
					timeoutMs: 100,
					approval: "never",
					inputSchema: z.unknown(),
					outputSchema: z.unknown(),
				},
				arguments: { accountRef: handle, period: "last_30_days" },
				context: {
					session: currentSession,
					traceId: "trace-a",
					workflowId: null,
					decisionId: "decision-a",
				},
			}),
		).toEqual({
			accountRef: "private-account-id",
			period: "last_30_days",
		});
	});
});
