import {
	createCipheriv,
	createDecipheriv,
	createHash,
	randomBytes,
} from "node:crypto";
import type {
	MintHandleInput,
	PrivateDataBroker,
	ResolveHandleInput,
} from "../../domain/session.js";
import type { KeyValueStore } from "./key-value-store.js";

export type KvPrivateDataBrokerOptions = {
	keyPrefix: string;
	encryptionKey: Uint8Array;
	defaultTtlSeconds: number;
	now?: () => Date;
};

export function privateDataEncryptionKeyFromConfig(value: string): Uint8Array {
	const key = Buffer.from(value, "base64url");
	if (key.byteLength !== 32) {
		throw new Error(
			"PRIVATE_DATA_ENCRYPTION_KEY must be a base64url-encoded 32-byte key",
		);
	}
	return key;
}

type StoredHandle = {
	sessionIdHash: string;
	userId: string;
	tenantId: string;
	toolId: string;
	audience: string;
	purpose: string;
	sessionVersion: number;
	expiresAt: string;
	singleUse: boolean;
	encryptedValue: string;
};

function hashIdentifier(value: string): string {
	return createHash("sha256").update(value).digest("base64url");
}

function encrypt(value: unknown, key: Uint8Array): string {
	if (key.byteLength !== 32) {
		throw new Error("Private data encryption key must be 32 bytes");
	}
	const plaintext = JSON.stringify(value);
	if (plaintext === undefined) {
		throw new Error("Private handle value must be JSON serializable");
	}
	const iv = randomBytes(12);
	const cipher = createCipheriv("aes-256-gcm", key, iv);
	const ciphertext = Buffer.concat([
		cipher.update(plaintext, "utf8"),
		cipher.final(),
	]);
	return [iv, cipher.getAuthTag(), ciphertext]
		.map((part) => part.toString("base64url"))
		.join(".");
}

function decrypt(encoded: string, key: Uint8Array): unknown {
	const parts = encoded.split(".");
	if (parts.length !== 3 || key.byteLength !== 32) {
		throw new Error("Invalid encrypted private handle");
	}
	const [ivEncoded, tagEncoded, ciphertextEncoded] = parts;
	if (!ivEncoded || !tagEncoded || !ciphertextEncoded) {
		throw new Error("Invalid encrypted private handle");
	}
	const decipher = createDecipheriv(
		"aes-256-gcm",
		key,
		Buffer.from(ivEncoded, "base64url"),
	);
	decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
	const plaintext = Buffer.concat([
		decipher.update(Buffer.from(ciphertextEncoded, "base64url")),
		decipher.final(),
	]).toString("utf8");
	return JSON.parse(plaintext) as unknown;
}

export class KvPrivateDataBroker implements PrivateDataBroker {
	private readonly now: () => Date;

	constructor(
		private readonly store: KeyValueStore,
		private readonly options: KvPrivateDataBrokerOptions,
	) {
		this.now = options.now ?? (() => new Date());
	}

	async mintHandle(input: MintHandleInput): Promise<string> {
		const expiresInSeconds = Math.min(
			input.expiresInSeconds,
			this.options.defaultTtlSeconds,
		);
		if (!Number.isInteger(expiresInSeconds) || expiresInSeconds < 1) {
			throw new Error("Handle expiration must be a positive integer");
		}
		if (!input.singleUse) {
			throw new Error("Private data handles must be single-use");
		}

		const handle = randomBytes(24).toString("base64url");
		const stored: StoredHandle = {
			sessionIdHash: hashIdentifier(input.session.sessionId),
			userId: input.session.userId,
			tenantId: input.session.tenantId,
			toolId: input.toolId,
			audience: input.audience,
			purpose: input.purpose,
			sessionVersion: input.session.sessionVersion,
			expiresAt: new Date(
				this.now().getTime() + expiresInSeconds * 1000,
			).toISOString(),
			singleUse: input.singleUse,
			encryptedValue: encrypt(input.value, this.options.encryptionKey),
		};

		const persisted = await this.store.setIfAbsent(
			this.key(input.session.sessionId, handle),
			JSON.stringify(stored),
			expiresInSeconds,
		);
		if (!persisted) {
			throw new Error("Unable to persist private data handle");
		}
		return handle;
	}

	async resolveHandle(input: ResolveHandleInput): Promise<unknown> {
		const raw = await this.store.getAndDelete(
			this.key(input.session.sessionId, input.handle),
		);
		if (!raw) {
			throw new Error("Private data handle is absent, expired, or revoked");
		}

		let stored: StoredHandle;
		try {
			stored = JSON.parse(raw) as StoredHandle;
		} catch {
			throw new Error("Private data handle is invalid");
		}

		if (
			stored.sessionIdHash !== hashIdentifier(input.session.sessionId) ||
			stored.userId !== input.session.userId ||
			stored.tenantId !== input.session.tenantId ||
			stored.toolId !== input.toolId ||
			stored.audience !== input.audience ||
			stored.purpose !== input.purpose ||
			stored.sessionVersion !== input.session.sessionVersion ||
			!Number.isFinite(Date.parse(stored.expiresAt)) ||
			Date.parse(stored.expiresAt) <= this.now().getTime()
		) {
			throw new Error("Private data handle binding is invalid");
		}

		return decrypt(stored.encryptedValue, this.options.encryptionKey);
	}

	private key(sessionId: string, handle: string): string {
		return `${this.options.keyPrefix}handle:${hashIdentifier(sessionId)}:${hashIdentifier(handle)}`;
	}
}
