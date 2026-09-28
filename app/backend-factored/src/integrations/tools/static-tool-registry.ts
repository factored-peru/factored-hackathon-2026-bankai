import type { ToolDefinition } from "../../domain/tools/contracts.js";
import type { ToolRegistry } from "../../services/ports/tools.js";

export class StaticToolRegistry implements ToolRegistry {
	private readonly tools = new Map<string, ToolDefinition>();

	constructor(definitions: ToolDefinition[]) {
		for (const definition of definitions) {
			const key = this.key(definition.id, definition.version);
			if (this.tools.has(key)) {
				throw new Error(`Duplicate tool definition: ${key}`);
			}
			this.tools.set(key, definition);
		}
	}

	get(toolId: string, version: string): ToolDefinition | null {
		return this.tools.get(this.key(toolId, version)) ?? null;
	}

	private key(toolId: string, version: string): string {
		return `${toolId}@${version}`;
	}
}
