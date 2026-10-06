/**
 * The query a thread is waiting to finish after the assistant asked for more
 * data. The next message of the thread is read as the answer, so the whole
 * exchange goes through the control plane again (guardrail, privacy, JEV) as
 * one request.
 *
 * The state is ephemeral by design (a few minutes, one use). In production it
 * lives in Memorystore for Valkey; the in-memory store below is per process and
 * serves tests and local runs without a KV.
 */
export type PendingClarification = Readonly<{
	original: string;
	/** Answered questions of this thread, oldest first. */
	exchanges: ReadonlyArray<Readonly<{ question: string; answer: string }>>;
	/** The question still waiting for an answer. */
	question: string;
}>;

export interface PendingClarificationStore {
	/** Removes and returns the entry; an expired or absent one is null. */
	take(key: string): Promise<PendingClarification | null>;
	put(key: string, entry: PendingClarification): Promise<void>;
}

export class InMemoryPendingClarificationStore
	implements PendingClarificationStore
{
	private readonly entries = new Map<
		string,
		{ value: PendingClarification; expiresAt: number }
	>();

	constructor(
		private readonly now: () => number = () => Date.now(),
		private readonly ttlMs = 5 * 60_000,
		private readonly maxEntries = 1_000,
	) {}

	async take(key: string): Promise<PendingClarification | null> {
		const entry = this.entries.get(key);
		this.entries.delete(key);
		return entry !== undefined && entry.expiresAt > this.now()
			? entry.value
			: null;
	}

	async put(key: string, value: PendingClarification): Promise<void> {
		this.entries.delete(key);
		if (this.entries.size >= this.maxEntries) {
			const oldest = this.entries.keys().next();
			if (!oldest.done) this.entries.delete(oldest.value);
		}
		this.entries.set(key, { value, expiresAt: this.now() + this.ttlMs });
	}
}

const maxExchanges = 3;

/** Longer than this is a new question, not an answer to the pending one. */
export const maxClarificationAnswerLength = 200;

/** One message that carries the original query and what was asked/answered. */
export function composeClarifiedMessage(
	pending: PendingClarification,
	answer: string,
): { message: string; exchanges: PendingClarification["exchanges"] } {
	const exchanges = [
		...pending.exchanges,
		{ question: pending.question, answer },
	].slice(-maxExchanges);
	const lines = [`Consulta original: ${pending.original}`];
	for (const exchange of exchanges) {
		lines.push(`Pregunta del asistente: ${exchange.question}`);
		lines.push(`Respuesta del cliente: ${exchange.answer}`);
	}
	return { message: lines.join("\n"), exchanges };
}
