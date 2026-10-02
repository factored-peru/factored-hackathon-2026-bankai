export type SessionContext = {
	sessionId: string;
	userId: string;
	tenantId: string;
	scopes: string[];
	roles: string[];
	capabilities: string[];
	sessionVersion: number;
	createdAt: string;
	lastSeenAt: string;
	expiresAt: string;
	revokedAt: string | null;
};

export type CreateSessionInput = {
	userId: string;
	tenantId: string;
	scopes: string[];
	roles: string[];
	capabilities: string[];
};

export interface SessionStore {
	get(sessionId: string): Promise<SessionContext | null>;
	create(input: CreateSessionInput): Promise<SessionContext>;
	rotate(sessionId: string): Promise<SessionContext>;
	revoke(sessionId: string, reason: string): Promise<void>;
}

export type MintHandleInput = {
	session: SessionContext;
	toolId: string;
	audience: string;
	purpose: string;
	value: unknown;
	expiresInSeconds: number;
	singleUse: boolean;
};

export type ResolveHandleInput = {
	session: SessionContext;
	handle: string;
	toolId: string;
	audience: string;
	purpose: string;
};

export interface PrivateDataBroker {
	mintHandle(input: MintHandleInput): Promise<string>;
	resolveHandle(input: ResolveHandleInput): Promise<unknown>;
}
