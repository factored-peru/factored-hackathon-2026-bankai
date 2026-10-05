import { describe, expect, test } from "bun:test";
import { randomBytes } from "node:crypto";
import { envSchema } from "../../src/config/env.js";
import { buildServer } from "../../src/http/server.js";
import { CachingConversationStore } from "../../src/integrations/cache/caching-conversation-store.js";
import { CachingSessionStore } from "../../src/integrations/cache/caching-session-store.js";
import { FirestoreUserProfileStore } from "../../src/integrations/firestore/firestore-user-profile-store.js";
import {
	buildFixtureSeedPlan,
	fixtureCustomerId,
} from "../../src/integrations/identity/demo-identity-seed.js";
import { FirestoreCustomerIdentityResolver } from "../../src/integrations/identity/firestore-customer-identity-resolver.js";
import { UserProfileBackedActorDirectory } from "../../src/integrations/identity/user-profile-backed-actor-directory.js";
import type { KeyValueStore } from "../../src/integrations/kv/key-value-store.js";
import { KvSessionStore } from "../../src/integrations/kv/kv-session-store.js";
import { InMemoryDemoActorDirectory } from "../../src/integrations/memory/demo-actor-directory.js";
import { InMemoryAttachmentStore } from "../../src/integrations/memory/in-memory-attachment-store.js";
import { InMemoryConversationStore } from "../../src/integrations/memory/in-memory-conversation-store.js";
import type { ProductiveDataStores } from "../../src/integrations/productive-data-stores.js";
import { createSessionRuntime } from "../../src/integrations/session-runtime.js";

class MemoryFirestore {
	private readonly docs = new Map<string, unknown>();

	collection(name: string) {
		return {
			doc: (id: string) => {
				const key = `${name}/${id}`;
				return {
					get: async () => {
						const data = this.docs.get(key);
						return {
							exists: data !== undefined,
							data: () => data,
						};
					},
					set: async (value: unknown) => {
						this.docs.set(key, value);
					},
				};
			},
		};
	}
}

class FakeKeyValueStore implements KeyValueStore {
	private readonly hashes = new Map<string, Record<string, string>>();
	private readonly values = new Map<string, string>();

	async hashSet(key: string, values: Record<string, string>): Promise<void> {
		this.hashes.set(key, { ...(this.hashes.get(key) ?? {}), ...values });
	}
	async hashGetAll(key: string): Promise<Record<string, string>> {
		return { ...(this.hashes.get(key) ?? {}) };
	}
	async expire(): Promise<void> {}
	async delete(key: string): Promise<boolean> {
		return this.hashes.delete(key) || this.values.delete(key);
	}
	async get(key: string): Promise<string | null> {
		return this.values.get(key) ?? null;
	}
	async set(key: string, value: string): Promise<void> {
		this.values.set(key, value);
	}
	async setIfAbsent(key: string, value: string): Promise<boolean> {
		if (this.values.has(key)) return false;
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
	async close(): Promise<void> {}
}

async function seedMemoryStores(firestore: MemoryFirestore) {
	const plan = buildFixtureSeedPlan();
	const profiles = new FirestoreUserProfileStore(firestore as never);
	for (const actor of plan.actors) {
		await profiles.upsert({
			tenantId: plan.tenantId,
			userId: actor.userId,
			roles: [...actor.roles, "seeded"],
			capabilities: [...actor.capabilities],
			status: "active",
			displayLabel: actor.displayLabel,
		});
		if (actor.hasCustomerBinding) {
			await firestore
				.collection(plan.bindingsCollection)
				.doc(actor.docId)
				.set({
					tenantId: plan.tenantId,
					userId: actor.userId,
					customerId: fixtureCustomerId(actor.userId),
					status: "active",
					version: "demo-identity-seed-v1",
				});
		}
	}
	return { plan, profiles };
}

function productiveFromMemory(
	firestore: MemoryFirestore,
): ProductiveDataStores {
	return {
		conversationStore: new CachingConversationStore(
			new InMemoryConversationStore(),
		),
		attachmentStore: new InMemoryAttachmentStore() as never,
		userProfileStore: new FirestoreUserProfileStore(firestore as never),
		customerIdentity: new FirestoreCustomerIdentityResolver(firestore as never),
	};
}

describe("productive stores + demo identity (simulated)", () => {
	test("seeded user_profiles override demo session roles via /v1/me", async () => {
		const firestore = new MemoryFirestore();
		await seedMemoryStores(firestore);
		const runtimeEnv = envSchema.parse({
			APP_ENV: "dev",
			DEMO_AUTH_ENABLED: true,
			REALTIME_ENABLED: true,
			CORS_ALLOWED_ORIGINS: "http://localhost:3001",
		});
		const app = await buildServer({
			env: runtimeEnv,
			productiveDataStores: productiveFromMemory(firestore),
		});
		const login = await app.inject({
			method: "POST",
			url: "/v1/demo/sessions",
			payload: { actorId: "demo-customer-1" },
		});
		expect(login.statusCode).toBe(201);
		const setCookie = login.headers["set-cookie"];
		const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
		expect(cookie).toContain("__Host-session=");
		expect(cookie).toContain("Secure");
		expect(cookie).toContain("HttpOnly");
		const me = await app.inject({
			method: "GET",
			url: "/v1/me",
			headers: { cookie: cookie ?? "" },
		});
		expect(me.statusCode).toBe(200);
		expect(me.json()).toMatchObject({
			userId: "demo-customer-1",
			tenantId: "demo-bankai",
			roles: expect.arrayContaining(["customer", "seeded"]),
		});
		await app.close();
	});

	test("KvSessionStore + profile directory round-trip session context", async () => {
		const firestore = new MemoryFirestore();
		const { profiles } = await seedMemoryStores(firestore);
		const directory = new UserProfileBackedActorDirectory(
			new InMemoryDemoActorDirectory(),
			profiles,
		);
		const actor = await directory.resolve("demo-customer-1");
		expect(actor).not.toBeNull();
		if (!actor) throw new Error("expected seeded actor");
		const sessions = new CachingSessionStore(
			new KvSessionStore(new FakeKeyValueStore(), {
				keyPrefix: "session:",
				ttlSeconds: 900,
			}),
		);
		const created = await sessions.create({
			userId: actor.userId,
			tenantId: actor.tenantId,
			roles: [...actor.roles],
			capabilities: [...actor.capabilities],
			scopes: ["dispute:read"],
		});
		const loaded = await sessions.get(created.sessionId);
		expect(loaded?.roles).toEqual(
			expect.arrayContaining(["customer", "seeded"]),
		);
		expect(loaded?.tenantId).toBe("demo-bankai");
	});

	test("Firestore identity binding resolves seeded synthetic customer", async () => {
		const firestore = new MemoryFirestore();
		await seedMemoryStores(firestore);
		const identity = new FirestoreCustomerIdentityResolver(firestore as never);
		const customerId = await identity.resolve({
			sessionId: "s",
			userId: "demo-customer-1",
			tenantId: "demo-bankai",
			scopes: [],
			roles: ["customer"],
			capabilities: [],
			sessionVersion: 1,
			createdAt: "2026-10-05T00:00:00.000Z",
			lastSeenAt: "2026-10-05T00:00:00.000Z",
			expiresAt: "2026-10-05T01:00:00.000Z",
			revokedAt: null,
		});
		expect(customerId).toBe(fixtureCustomerId("demo-customer-1"));
	});
});

describe("productive stores opt-in (Valkey)", () => {
	const enabled = process.env.PRODUCTIVE_STORES_TEST === "1";
	const kvUrl = process.env.KV_URL?.trim() ?? "";

	test.skipIf(!enabled || kvUrl.length === 0)(
		"SessionRuntime connects when PRODUCTIVE_STORES_TEST=1 and KV_URL is set",
		async () => {
			const settings = envSchema.parse({
				SESSION_STORE_ENABLED: true,
				KV_PROVIDER: process.env.KV_PROVIDER ?? "valkey",
				KV_URL: kvUrl,
				KV_TLS: process.env.KV_TLS === "true",
				PRIVATE_DATA_ENCRYPTION_KEY:
					process.env.PRIVATE_DATA_ENCRYPTION_KEY ??
					randomBytes(32).toString("base64url"),
			});
			const runtime = await createSessionRuntime(settings);
			expect(runtime.isReady()).toBe(true);
			await runtime.close();
		},
	);
});

describe("Cloud Run demo smoke (optional)", () => {
	const baseUrl = process.env.CLOUD_RUN_SMOKE_URL?.replace(/\/$/, "") ?? "";

	test.skipIf(baseUrl.length === 0)(
		"POST /v1/demo/sessions then GET /v1/me against staging",
		async () => {
			const login = await fetch(`${baseUrl}/v1/demo/sessions`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ actorId: "demo-customer-1" }),
			});
			expect(login.status).toBe(201);
			const setCookie = login.headers.getSetCookie?.() ?? [];
			const cookieHeader =
				setCookie.find((value) => value.includes("__Host-session=")) ??
				login.headers.get("set-cookie");
			expect(cookieHeader).toBeTruthy();
			expect(cookieHeader).toContain("Secure");
			const sessionPair = (cookieHeader ?? "").split(";")[0]?.trim();
			const me = await fetch(`${baseUrl}/v1/me`, {
				headers: { cookie: sessionPair ?? "" },
			});
			expect(me.status).toBe(200);
			const body = (await me.json()) as { userId?: string; roles?: string[] };
			expect(body.userId).toBeTruthy();
			expect(Array.isArray(body.roles)).toBe(true);
		},
	);
});
