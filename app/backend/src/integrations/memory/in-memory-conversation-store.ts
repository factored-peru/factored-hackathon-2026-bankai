import type {
	ConversationSnapshot,
	WebsocketServerEvent,
} from "../../domain/conversation/contracts.js";
import type {
	ConversationEventPublisher,
	ConversationStore,
} from "../../services/ports/conversation.js";

export class InMemoryConversationStore implements ConversationStore {
	private readonly records = new Map<string, ConversationSnapshot>();

	async get(threadId: string): Promise<ConversationSnapshot | null> {
		const value = this.records.get(threadId);
		return value ? structuredClone(value) : null;
	}

	async list(
		tenantId: string,
		ownerUserId?: string,
	): Promise<ConversationSnapshot[]> {
		return [...this.records.values()]
			.filter(
				(value) =>
					value.tenantId === tenantId &&
					(ownerUserId === undefined || value.ownerUserId === ownerUserId),
			)
			.map((value) => structuredClone(value));
	}

	async save(
		snapshot: ConversationSnapshot,
		expectedRevision: number | null,
	): Promise<boolean> {
		const current = this.records.get(snapshot.threadId);
		if ((current?.revision ?? null) !== expectedRevision) return false;
		this.records.set(snapshot.threadId, structuredClone(snapshot));
		return true;
	}
}

export class InMemoryConversationEventPublisher
	implements ConversationEventPublisher
{
	private readonly listeners = new Map<
		string,
		Set<(event: WebsocketServerEvent) => void>
	>();

	async publish(input: {
		tenantId: string;
		event: WebsocketServerEvent;
	}): Promise<void> {
		for (const listener of this.listeners.get(input.tenantId) ?? [])
			listener(structuredClone(input.event));
	}

	subscribe(
		tenantId: string,
		listener: (event: WebsocketServerEvent) => void,
	): () => void {
		const set = this.listeners.get(tenantId) ?? new Set();
		set.add(listener);
		this.listeners.set(tenantId, set);
		return () => {
			set.delete(listener);
			if (set.size === 0) this.listeners.delete(tenantId);
		};
	}
}
