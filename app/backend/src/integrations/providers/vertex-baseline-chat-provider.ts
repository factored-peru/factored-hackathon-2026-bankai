import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type {
	BaselineChatModel,
	BaselineModelTurn,
	BaselineToolCall,
} from "../../services/ports/baseline-chat.js";

/**
 * Vertex adapter for the explicit baseline only; it receives raw user text.
 * Contents are ordered stable-prefix → user → (tool turns) so Gemini's
 * implicit prompt cache can reuse the tokenized prefix across turns.
 */
export class VertexBaselineChatProvider implements BaselineChatModel {
	constructor(
		private readonly client: GoogleGenAI,
		private readonly model: string,
	) {}

	async begin(input: {
		system: string;
		user: string;
		tool: {
			name: string;
			description: string;
			parametersJsonSchema: Record<string, unknown>;
		};
		stablePrefix?: string;
	}): Promise<BaselineModelTurn> {
		const response = await this.client.models.generateContent({
			model: this.model,
			contents: contentsWithStablePrefix(input.stablePrefix, input.user),
			config: {
				systemInstruction: input.system,
				temperature: 0.2,
				maxOutputTokens: 1024,
				tools: [functionTool(input.tool)],
			},
		});
		return toTurn(response);
	}

	async continue(input: {
		system: string;
		user: string;
		tool: {
			name: string;
			description: string;
			parametersJsonSchema: Record<string, unknown>;
		};
		call: BaselineToolCall;
		result: {
			status: "ready" | "failed";
			queryId: string | null;
			queryVersion: string | null;
			rows: readonly Readonly<
				Record<string, string | number | boolean | null>
			>[];
			rowCount: number;
			bytesProcessed: number | null;
			durationMs: number | null;
			reasonCode: string | null;
		};
		stablePrefix?: string;
	}): Promise<BaselineModelTurn> {
		const response = await this.client.models.generateContent({
			model: this.model,
			contents: [
				...stablePrefixTurns(input.stablePrefix),
				{ role: "user", parts: [{ text: input.user }] },
				{
					role: "model",
					parts: [
						{
							functionCall: {
								name: input.call.name,
								args: asObject(input.call.args),
								...(input.call.callId === null
									? {}
									: { id: input.call.callId }),
							},
						},
					],
				},
				{
					role: "user",
					parts: [
						{
							functionResponse: {
								name: input.call.name,
								response: { output: input.result },
								...(input.call.callId === null
									? {}
									: { id: input.call.callId }),
							},
						},
					],
				},
			],
			config: {
				systemInstruction: input.system,
				temperature: 0.2,
				maxOutputTokens: 1024,
				tools: [functionTool(input.tool)],
			},
		});
		return toTurn(response);
	}
}

function functionTool(tool: {
	name: string;
	description: string;
	parametersJsonSchema: Record<string, unknown>;
}) {
	return {
		functionDeclarations: [
			{
				name: tool.name,
				description: tool.description,
				parametersJsonSchema: tool.parametersJsonSchema,
			},
		],
	};
}

/** Stable catalog/graph marker first; variable user text last. */
export function contentsWithStablePrefix(
	stablePrefix: string | undefined,
	user: string,
): Array<{ role: string; parts: Array<{ text: string }> }> {
	return [
		...stablePrefixTurns(stablePrefix),
		{ role: "user", parts: [{ text: user }] },
	];
}

function stablePrefixTurns(
	stablePrefix: string | undefined,
): Array<{ role: string; parts: Array<{ text: string }> }> {
	if (stablePrefix === undefined || stablePrefix.trim().length === 0) {
		return [];
	}
	return [{ role: "user", parts: [{ text: stablePrefix }] }];
}

function toTurn(response: {
	text: string | undefined;
	functionCalls:
		| readonly {
				name?: string;
				args?: unknown;
				id?: string;
		  }[]
		| undefined;
}): BaselineModelTurn {
	const call = response.functionCalls?.[0];
	if (call !== undefined) {
		return {
			kind: "tool_call",
			call: {
				name: call.name ?? "",
				args: call.args ?? {},
				callId: call.id ?? null,
			},
		};
	}
	return { kind: "final", text: response.text };
}

function asObject(value: unknown): Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

export function createVertexBaselineChatProvider(settings: {
	VERTEX_AI_PROJECT_ID: string;
	VERTEX_AI_LOCATION: string;
	VERTEX_AI_MODEL: string;
}): BaselineChatModel {
	return new VertexBaselineChatProvider(
		new GoogleGenAI({
			vertexai: true,
			project: settings.VERTEX_AI_PROJECT_ID,
			location: settings.VERTEX_AI_LOCATION,
		}),
		settings.VERTEX_AI_MODEL,
	);
}

export type VertexBaselineSettings = Readonly<{
	VERTEX_AI_ENABLED: boolean;
	VERTEX_AI_PROJECT_ID: string;
	VERTEX_AI_LOCATION: string;
	VERTEX_AI_MODEL: string;
}>;

const vertexBaselineEnvSchema = z.object({
	VERTEX_AI_ENABLED: z.union([z.boolean(), z.stringbool()]).default(false),
	VERTEX_AI_PROJECT_ID: z.string().default(""),
	VERTEX_AI_LOCATION: z.string().default(""),
	VERTEX_AI_MODEL: z.string().default(""),
});

/**
 * Reads only VERTEX_AI_* from process.env so eval:compare does not require
 * full runtime validation (KV, Firestore, etc.).
 */
export function loadVertexBaselineSettingsFromProcessEnv(
	source: NodeJS.ProcessEnv = process.env,
): VertexBaselineSettings {
	return vertexBaselineEnvSchema.parse({
		VERTEX_AI_ENABLED: source.VERTEX_AI_ENABLED,
		VERTEX_AI_PROJECT_ID: source.VERTEX_AI_PROJECT_ID,
		VERTEX_AI_LOCATION: source.VERTEX_AI_LOCATION,
		VERTEX_AI_MODEL: source.VERTEX_AI_MODEL,
	});
}

export type BaselineModelMode = "auto" | "vertex" | "synthetic";

/**
 * Resolve a live Vertex baseline model for A/B, or null for the scripted double.
 */
export function createBaselineChatModelFromEnv(
	settings: VertexBaselineSettings,
	mode: BaselineModelMode = "auto",
): { model: BaselineChatModel; modelId: string } | null {
	const wantVertex =
		mode === "vertex" || (mode === "auto" && settings.VERTEX_AI_ENABLED);
	if (!wantVertex || mode === "synthetic") return null;

	if (
		!settings.VERTEX_AI_ENABLED ||
		settings.VERTEX_AI_PROJECT_ID.length === 0 ||
		settings.VERTEX_AI_LOCATION.length === 0 ||
		settings.VERTEX_AI_MODEL.length === 0
	) {
		if (mode === "vertex") {
			throw new Error("vertex_baseline_misconfigured");
		}
		return null;
	}

	return {
		model: createVertexBaselineChatProvider(settings),
		modelId: settings.VERTEX_AI_MODEL,
	};
}
