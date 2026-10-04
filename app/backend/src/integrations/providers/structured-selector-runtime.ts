import type { Env } from "../../config/env.js";
import { ComposedStructuredQuerySelector } from "../../services/retrieval/structured-selection.js";
import { TypeSafeEntryChooser } from "./typesafe-entry-chooser.js";
import {
	createVertexGenerateText,
	type GenerateText,
	VertexParameterInterpreter,
} from "./vertex-parameter-interpreter.js";

export type StructuredSelectorSettings = Pick<
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
 * The real selector: the JEV chooses the catalog entry and Vertex AI reads its
 * parameters. Each provider must be explicitly enabled; a disabled one fails
 * closed instead of silently falling back to another model.
 */
export async function createStructuredSelector(
	settings: StructuredSelectorSettings,
	overrides: { fetch?: typeof fetch; generate?: GenerateText } = {},
): Promise<ComposedStructuredQuerySelector> {
	if (!settings.JEV_ENABLED) {
		throw new Error("structured_selector_jev_disabled");
	}
	if (!settings.VERTEX_AI_ENABLED && overrides.generate === undefined) {
		throw new Error("structured_selector_vertex_disabled");
	}

	return new ComposedStructuredQuerySelector(
		new TypeSafeEntryChooser({
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
