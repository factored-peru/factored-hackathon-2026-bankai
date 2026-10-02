import type {
	ToolDefinition,
	ToolExecutionContext,
} from "../../domain/tools/contracts.js";

export interface ToolRegistry {
	get(toolId: string, version: string): ToolDefinition | null;
}

export interface ToolArgumentResolver {
	resolve(input: {
		definition: ToolDefinition;
		arguments: unknown;
		context: ToolExecutionContext;
	}): Promise<unknown>;
}

export interface ToolExecutor {
	execute(input: {
		definition: ToolDefinition;
		arguments: unknown;
		context: ToolExecutionContext;
	}): Promise<unknown>;
}

export type IdempotencyClaim =
	| Readonly<{ status: "acquired" }>
	| Readonly<{ status: "replay"; result: unknown }>
	| Readonly<{ status: "conflict" | "in_progress" }>;

export interface IdempotencyStore {
	claim(key: string, payloadHash: string): Promise<IdempotencyClaim>;
	complete(key: string, payloadHash: string, result: unknown): Promise<void>;
	markIndeterminate(key: string, payloadHash: string): Promise<void>;
	release(key: string, payloadHash: string): Promise<void>;
}
