import type { RagCatalog, RagCatalogEntry } from "./rag-catalog.js";
import type { StructuredQuerySelector } from "./structured-rag.js";

export type EntryChoice =
	| Readonly<{ decision: "choose"; id: string; version: string }>
	| Readonly<{ decision: "ambiguous" }>
	| Readonly<{ decision: "deny" }>;

/**
 * The specialized judge (JEV): picks ONE of the catalog entries it is shown,
 * or says none fits (`deny`) or it is not sure (`ambiguous`). It never extracts
 * values and never sees SQL.
 */
export interface StructuredEntryChooser {
	choose(input: {
		query: string;
		entries: readonly RagCatalogEntry[];
		traceId: string;
	}): Promise<EntryChoice>;
}

/**
 * Reads the caller-fillable parameters of one chosen entry from the message.
 * Missing or unsupported values are simply left out; the parameter binder
 * decides whether that is acceptable. Returns `null` when nothing usable.
 */
export interface StructuredParameterInterpreter {
	interpret(input: {
		query: string;
		entry: RagCatalogEntry;
		today: string;
		traceId: string;
	}): Promise<Record<string, unknown> | null>;
}

/**
 * Joins the two roles into the selector StructuredRag consumes: the judge
 * chooses the entry, then the interpreter fills its parameters. The judge's
 * answer is only honored if it names an entry of the catalog it was shown.
 */
export class ComposedStructuredQuerySelector
	implements StructuredQuerySelector
{
	constructor(
		private readonly chooser: StructuredEntryChooser,
		private readonly interpreter: StructuredParameterInterpreter,
		private readonly now: () => Date = () => new Date(),
	) {}

	async select(input: {
		query: string;
		catalog: RagCatalog;
		traceId: string;
	}): Promise<unknown> {
		const choice = await this.chooser.choose({
			query: input.query,
			entries: input.catalog.entries,
			traceId: input.traceId,
		});
		if (choice.decision !== "choose") {
			return { decision: choice.decision };
		}

		const entry = input.catalog.entries.find(
			(candidate) =>
				candidate.id === choice.id && candidate.version === choice.version,
		);
		if (entry === undefined) {
			return { decision: "deny" };
		}

		let parameters: Record<string, unknown> = {};
		if ((entry.parameters ?? []).length > 0) {
			const interpreted = await this.interpreter.interpret({
				query: input.query,
				entry,
				today: this.now().toISOString().slice(0, 10),
				traceId: input.traceId,
			});
			if (interpreted === null) {
				return { decision: "ambiguous" };
			}
			parameters = interpreted;
		}
		return {
			decision: "select",
			queryId: entry.id,
			version: entry.version,
			parameters,
		};
	}
}
