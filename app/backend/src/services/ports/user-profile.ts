/** Durable user profile for roles/capabilities (ADR 0017). */

export type UserProfile = Readonly<{
	tenantId: string;
	userId: string;
	roles: ReadonlyArray<string>;
	capabilities: ReadonlyArray<string>;
	status: "active" | "revoked";
	displayLabel: string | null;
	updatedAt: string;
}>;

export type UpsertUserProfileInput = Readonly<{
	tenantId: string;
	userId: string;
	roles: ReadonlyArray<string>;
	capabilities: ReadonlyArray<string>;
	status?: "active" | "revoked";
	displayLabel?: string | null;
}>;

export interface UserProfileStore {
	get(tenantId: string, userId: string): Promise<UserProfile | null>;
	upsert(input: UpsertUserProfileInput): Promise<UserProfile>;
}
