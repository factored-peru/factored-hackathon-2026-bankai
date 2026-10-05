import { describe, expect, test } from "bun:test";
import { FirestoreUserProfileStore } from "../src/integrations/firestore/firestore-user-profile-store.js";
import { UserProfileBackedActorDirectory } from "../src/integrations/identity/user-profile-backed-actor-directory.js";
import { InMemoryDemoActorDirectory } from "../src/integrations/memory/demo-actor-directory.js";

describe("FirestoreUserProfileStore", () => {
	test("upserts and reads profiles by tenant/user hash", async () => {
		const docs = new Map<string, unknown>();
		const firestore = {
			collection: () => ({
				doc: (id: string) => ({
					async get() {
						const data = docs.get(id);
						return { exists: data !== undefined, data: () => data };
					},
					async set(value: unknown) {
						docs.set(id, value);
					},
				}),
			}),
		};
		const store = new FirestoreUserProfileStore(
			firestore as never,
			"user_profiles",
			() => new Date("2026-10-04T12:00:00.000Z"),
		);
		const saved = await store.upsert({
			tenantId: "demo-bankai",
			userId: "demo-customer-1",
			roles: ["customer", "vip"],
			capabilities: ["dispute.read"],
			displayLabel: "Cliente VIP",
		});
		expect(saved.status).toBe("active");
		expect(saved.updatedAt).toBe("2026-10-04T12:00:00.000Z");
		const loaded = await store.get("demo-bankai", "demo-customer-1");
		expect(loaded?.roles).toEqual(["customer", "vip"]);
	});
});

describe("UserProfileBackedActorDirectory", () => {
	test("overrides demo actor roles from durable profile", async () => {
		const profiles = {
			async get(tenantId: string, userId: string) {
				if (tenantId === "demo-bankai" && userId === "demo-customer-1") {
					return {
						tenantId,
						userId,
						roles: ["customer", "operator"],
						capabilities: ["dispute.read", "extra"],
						status: "active" as const,
						displayLabel: null,
						updatedAt: "2026-10-04T12:00:00.000Z",
					};
				}
				return null;
			},
			async upsert() {
				throw new Error("unused");
			},
		};
		const directory = new UserProfileBackedActorDirectory(
			new InMemoryDemoActorDirectory(),
			profiles,
		);
		const actor = await directory.resolve("demo-customer-1");
		expect(actor).toEqual({
			userId: "demo-customer-1",
			tenantId: "demo-bankai",
			roles: ["customer", "operator"],
			capabilities: ["dispute.read", "extra"],
		});
	});
});
