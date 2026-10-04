import { GoogleGenAI } from "@google/genai";
import type {
	BaselineChatModel,
	BaselineModelTurn,
	BaselineToolCall,
} from "../../services/ports/baseline-chat.js";

/** Vertex adapter for the explicit baseline only; it receives raw user text. */
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
	}): Promise<BaselineModelTurn> {
		const response = await this.client.models.generateContent({
			model: this.model,
			contents: input.user,
			config: {
				systemInstruction: input.system,
				temperature: 0.2,
				maxOutputTokens: 1024,
				tools: [
					{
						functionDeclarations: [
							{
								name: input.tool.name,
								description: input.tool.description,
								parametersJsonSchema: input.tool.parametersJsonSchema,
							},
						],
					},
				],
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
	}): Promise<BaselineModelTurn> {
		const response = await this.client.models.generateContent({
			model: this.model,
			contents: [
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
				tools: [
					{
						functionDeclarations: [
							{
								name: input.tool.name,
								description: input.tool.description,
								parametersJsonSchema: input.tool.parametersJsonSchema,
							},
						],
					},
				],
			},
		});
		return toTurn(response);
	}
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
