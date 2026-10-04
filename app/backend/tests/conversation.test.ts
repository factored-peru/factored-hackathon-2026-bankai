import { describe, expect, test } from "bun:test";
import type { SessionContext } from "../src/domain/session.js";
import { InMemoryAttachmentStore } from "../src/integrations/memory/in-memory-attachment-store.js";
import {
	InMemoryConversationEventPublisher,
	InMemoryConversationStore,
} from "../src/integrations/memory/in-memory-conversation-store.js";
import { ConversationService } from "../src/services/conversations/conversation-service.js";

const customer: SessionContext = {
	sessionId: "session-a",
	userId: "customer-a",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-10-03T00:00:00.000Z",
	lastSeenAt: "2026-10-03T00:00:00.000Z",
	expiresAt: "2026-10-04T00:00:00.000Z",
	revokedAt: null,
};

describe("ConversationService", () => {
	test("streams a sanitized assistant response and keeps a revisioned snapshot", async () => {
		const store = new InMemoryConversationStore();
		const events = new InMemoryConversationEventPublisher();
		const service = new ConversationService(
			store,
			new InMemoryAttachmentStore(),
			events,
			async (input) => {
				await input.onDelta("respuesta ");
				await input.onDelta("segura");
				return { status: "completed", response: "respuesta segura" };
			},
		);
		const received: string[] = [];
		const unsubscribe = events.subscribe(customer.tenantId, (value) =>
			received.push(value.type),
		);
		const queued = await service.send({
			session: customer,
			clientMessageId: "message-a",
			text: "Necesito ayuda",
			attachmentIds: [],
			traceId: "trace-a",
		});
		expect(queued.trace.status).toBe("queued");
		await new Promise((resolve) => setTimeout(resolve, 0));
		const snapshot = await service.get(customer, queued.threadId);
		expect(snapshot?.trace.status).toBe("completed");
		expect(snapshot?.messages).toHaveLength(2);
		expect(received).toContain("assistant.delta");
		unsubscribe();
	});

	test("does not let a customer open another customer thread", async () => {
		const service = new ConversationService(
			new InMemoryConversationStore(),
			new InMemoryAttachmentStore(),
			new InMemoryConversationEventPublisher(),
			async () => ({ status: "completed", response: "ok" }),
		);
		const snapshot = await service.send({
			session: customer,
			clientMessageId: "message-a",
			text: "hola",
			attachmentIds: [],
			traceId: "trace-a",
		});
		const other = { ...customer, sessionId: "session-b", userId: "customer-b" };
		expect(await service.get(other, snapshot.threadId)).toBeNull();
	});
});
