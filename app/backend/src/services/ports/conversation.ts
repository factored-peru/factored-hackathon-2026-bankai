import type {
	AttachmentKind,
	ConversationSnapshot,
	ConversationTrace,
	SafeAttachment,
	WebsocketServerEvent,
} from "../../domain/conversation/contracts.js";
import type { SessionContext } from "../../domain/session.js";

export interface ConversationStore {
	get(threadId: string): Promise<ConversationSnapshot | null>;
	list(tenantId: string, ownerUserId?: string): Promise<ConversationSnapshot[]>;
	save(
		snapshot: ConversationSnapshot,
		expectedRevision: number | null,
	): Promise<boolean>;
}

export interface AttachmentStore {
	create(input: {
		session: SessionContext;
		kind: AttachmentKind;
		mediaType: string;
		byteSize: number;
		filename: string;
	}): Promise<{ attachment: SafeAttachment; uploadUrl: string }>;
	complete(input: {
		attachmentId: string;
		session: SessionContext;
	}): Promise<SafeAttachment | null>;
	resolve(input: {
		attachmentId: string;
		session: SessionContext;
	}): Promise<SafeAttachment | null>;
}

export interface ConversationEventPublisher {
	publish(input: {
		tenantId: string;
		event: WebsocketServerEvent;
	}): Promise<void>;
	subscribe(
		tenantId: string,
		listener: (event: WebsocketServerEvent) => void,
	): () => void;
}

export interface CustomerTransactionReader {
	listForSession(session: SessionContext): Promise<unknown[]>;
}

export interface DemoActorDirectory {
	list(): Promise<
		ReadonlyArray<{
			actorId: string;
			label: string;
			role: "customer" | "backoffice";
			recommended: boolean;
		}>
	>;
	resolve(actorId: string): Promise<{
		userId: string;
		tenantId: string;
		roles: string[];
		capabilities: string[];
	} | null>;
}

export type ConversationRunner = (input: {
	session: SessionContext;
	threadId: string;
	traceId: string;
	message: string;
	onDelta: (value: string) => Promise<void>;
	onState?: (status: "retrieving" | "generating") => Promise<void>;
}) => Promise<{
	status: ConversationTrace["status"];
	response: string;
	reasonCode?: string;
	approvalId?: string;
	workflowId?: string;
	decisionId?: string;
	clarificationId?: string;
}>;
