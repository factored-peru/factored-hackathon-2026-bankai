import { describe, expect, test } from "bun:test";
import type { ConversationSnapshot } from "../src/domain/conversation/contracts.js";
import { CachingConversationStore } from "../src/integrations/cache/caching-conversation-store.js";
import { CachingSessionStore } from "../src/integrations/cache/caching-session-store.js";
import { withLruCache } from "../src/integrations/cache/lru-memo.js";
import { InMemoryConversationStore } from "../src/integrations/memory/in-memory-conversation-store.js";
import { InMemorySessionStore } from "../src/integrations/memory/in-memory-session-store.js";

describe("withLruCache", () => {
	test("evicts least-recently-used entries and honors TTL", async () => {
		let calls = 0;
		const cached = withLruCache(
			async (key: string) => {
				calls += 1;
				return `${key}-${calls}`;
			},
			{ maxEntries: 2, keyFn: (key) => key },
		);
		expect(await cached.get("a")).toBe("a-1");
		expect(await cached.get("b")).toBe("b-2");
		expect(await cached.get("a")).toBe("a-1");
		expect(await cached.get("c")).toBe("c-3");
		expect(await cached.get("b")).toBe("b-4");
		expect(calls).toBe(4);
		cached.invalidate("b");
		expect(await cached.get("b")).toBe("b-5");

		let ttlCalls = 0;
		const timed = withLruCache(
			async () => {
				ttlCalls += 1;
				return ttlCalls;
			},
			{ maxEntries: 4, ttlMs: 1, keyFn: () => "k" },
		);
		expect(await timed.get()).toBe(1);
		await Bun.sleep(5);
		expect(await timed.get()).toBe(2);
	});
});

describe("CachingSessionStore", () => {
	test("serves cached get until rotate/revoke", async () => {
		const inner = new InMemorySessionStore(
			() => new Date("2026-10-04T00:00:00.000Z"),
			3600,
			(() => {
				let n = 0;
				return () => `session-${++n}`;
			})(),
		);
		const store = new CachingSessionStore(inner, {
			maxEntries: 8,
			ttlMs: 60_000,
		});
		const created = await store.create({
			userId: "user-a",
			tenantId: "demo-bankai",
			scopes: [],
			roles: ["customer"],
			capabilities: [],
		});
		const first = await store.get(created.sessionId);
		const second = await store.get(created.sessionId);
		expect(first?.sessionVersion).toBe(1);
		expect(second?.sessionVersion).toBe(1);
		await store.rotate(created.sessionId);
		const rotated = await store.get(created.sessionId);
		expect(rotated?.sessionVersion).toBe(2);
		await store.revoke(created.sessionId, "test");
		const revoked = await store.get(created.sessionId);
		expect(revoked?.revokedAt).not.toBeNull();
	});
});

describe("CachingConversationStore", () => {
	test("invalidates get after successful save", async () => {
		const inner = new InMemoryConversationStore();
		const store = new CachingConversationStore(inner, {
			maxEntries: 8,
			ttlMs: 60_000,
		});
		const snapshot: ConversationSnapshot = {
			threadId: "thread-a",
			tenantId: "demo-bankai",
			ownerUserId: "user-a",
			revision: 1,
			messages: [],
			trace: {
				traceId: "trace-a",
				status: "completed",
				reasonCode: null,
				decisionId: null,
				workflowId: null,
				approvalId: null,
				updatedAt: "2026-10-04T00:00:00.000Z",
			},
		};
		expect(await store.save(snapshot, null)).toBe(true);
		expect((await store.get("thread-a"))?.revision).toBe(1);
		expect(await store.save({ ...snapshot, revision: 2 }, 1)).toBe(true);
		expect((await store.get("thread-a"))?.revision).toBe(2);
	});
});
