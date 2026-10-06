import type { Env } from "../../config/env.js";
import { ComposedKnowledgeGraphSelector } from "../../services/retrieval/knowledge-graph-composed-selection.js";
import type { KnowledgeGraphOperationSelector } from "../../services/retrieval/knowledge-graph-selection.js";
import { TypeSafeKgOperationChooser } from "./typesafe-kg-operation-chooser.js";
import {
	createVertexGenerateText,
	type GenerateText,
	VertexParameterInterpreter,
} from "./vertex-parameter-interpreter.js";

export type KnowledgeGraphSelectorSettings = Pick<
	Env,
	| "JEV_ENABLED"
	| "JEV_BASE_URL"
	| "JEV_API_KEY"
	| "JEV_MODEL"
	| "JEV_MIN_CONFIDENCE"
	| "JEV_TIMEOUT_MS"
	| "VERTEX_AI_ENABLED"
	| "VERTEX_AI_PROJECT_ID"
	| "VERTEX_AI_LOCATION"
	| "VERTEX_AI_MODEL"
>;

/**
 * Real KG specialized selector: TypeSafe chooses the catalog operation; Vertex
 * fills caller parameters. Same flags as Structured; a disabled provider fails
 * closed instead of silently falling back.
 */
export async function createKnowledgeGraphSelector(
	settings: KnowledgeGraphSelectorSettings,
	overrides: { fetch?: typeof fetch; generate?: GenerateText } = {},
): Promise<KnowledgeGraphOperationSelector> {
	if (!settings.JEV_ENABLED) {
		throw new Error("knowledge_graph_selector_jev_disabled");
	}
	if (!settings.VERTEX_AI_ENABLED && overrides.generate === undefined) {
		throw new Error("knowledge_graph_selector_vertex_disabled");
	}

	return new ComposedKnowledgeGraphSelector(
		new TypeSafeKgOperationChooser({
			baseUrl: settings.JEV_BASE_URL,
			apiKey: settings.JEV_API_KEY,
			model: settings.JEV_MODEL,
			minConfidence: settings.JEV_MIN_CONFIDENCE,
			timeoutMs: settings.JEV_TIMEOUT_MS,
			...(overrides.fetch === undefined ? {} : { fetch: overrides.fetch }),
		}),
		new VertexParameterInterpreter(
			overrides.generate ?? (await createVertexGenerateText(settings)),
		),
	);
}
