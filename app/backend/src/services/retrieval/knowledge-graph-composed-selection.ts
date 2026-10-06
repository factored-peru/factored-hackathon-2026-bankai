import type { KnowledgeGraphOperationSelector } from "./knowledge-graph-selection.js";
import type { RagCatalog } from "./rag-catalog.js";
import type {
	StructuredEntryChooser,
	StructuredParameterInterpreter,
} from "./structured-selection.js";

/**
 * Joins KG specialized JEV (operation choice) + parameter interpreter into the
 * selector the StateGraph `kg_jev` node consumes. Mirrors
 * ComposedStructuredQuerySelector; output is a KnowledgeGraphSelection shape.
 */
export class ComposedKnowledgeGraphSelector
	implements KnowledgeGraphOperationSelector
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
		if (input.catalog.kind !== "knowledge_graph") {
			return { decision: "deny" };
		}

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
			operationId: entry.id,
			version: entry.version,
			parameters,
		};
	}
}
