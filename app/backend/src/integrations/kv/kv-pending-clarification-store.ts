import { createHash } from "node:crypto";
import { z } from "zod";
import type {
	PendingClarification,
	PendingClarificationStore,
} from "../../services/conversations/pending-clarification.js";
import type { KeyValueStore } from "./key-value-store.js";
import { decrypt, encrypt } from "./kv-private-data-broker.js";

const pendingSchema = z
	.object({
		original: z.string(),
		exchanges: z.array(z.object({ question: z.string(), answer: z.string() })),
		question: z.string(),
	})
	.strict();

export type KvPendingClarificationOptions = Readonly<{
	keyPrefix: string;
	encryptionKey: Uint8Array;
	ttlSeconds?: number;
}>;

/**
 * Pending clarifications in Memorystore for Valkey (ADR 0005). The thread key
 * is hashed and the payload, which holds the client's own words, is encrypted
 * with the private-data key. `take` reads and deletes in one command, so a
 * pending query is used at most once even across instances.
 *
 * It is a convenience, not a guarantee: if the KV fails the turn simply runs
 * as a new question. Namespace: `{prefix}clarif:v1:{keyHash}`.
 */
export class KvPendingClarificationStore implements PendingClarificationStore {
	private readonly ttlSeconds: number;

	constructor(
		private readonly store: KeyValueStore,
		private readonly options: KvPendingClarificationOptions,
	) {
		this.ttlSeconds = options.ttlSeconds ?? 300;
	}

	async take(key: string): Promise<PendingClarification | null> {
		try {
			const raw = await this.store.getAndDelete(this.key(key));
			if (raw === null) return null;
			const parsed = pendingSchema.safeParse(
				decrypt(raw, this.options.encryptionKey),
			);
			return parsed.success ? parsed.data : null;
		} catch {
			return null;
		}
	}

	async put(key: string, entry: PendingClarification): Promise<void> {
		try {
			await this.store.set(
				this.key(key),
				encrypt(entry, this.options.encryptionKey),
				this.ttlSeconds,
			);
		} catch {
			// The query just will not resume.
		}
	}

	private key(value: string): string {
		const hash = createHash("sha256").update(value).digest("base64url");
		return `${this.options.keyPrefix}clarif:v1:${hash}`;
	}
}
