import type { PrivateDataBroker, SessionStore } from "../../domain/session.js";
import type { ToolArgumentResolver } from "../ports/tools.js";

export type PrivateArgumentBinding = Readonly<{
	argumentName: string;
	purpose: string;
	audience: string;
}>;

export type ToolPrivateArgumentBindings = Readonly<{
	toolId: string;
	version: string;
	bindings: PrivateArgumentBinding[];
}>;

export class SessionBoundArgumentResolver implements ToolArgumentResolver {
	private readonly bindings = new Map<string, PrivateArgumentBinding[]>();

	constructor(
		definitions: ToolPrivateArgumentBindings[],
		private readonly sessions: SessionStore,
		private readonly broker: PrivateDataBroker,
	) {
		for (const definition of definitions) {
			const key = this.key(definition.toolId, definition.version);
			if (this.bindings.has(key)) {
				throw new Error(`Duplicate private argument binding: ${key}`);
			}
			const argumentNames = new Set(
				definition.bindings.map((binding) => binding.argumentName),
			);
			if (argumentNames.size !== definition.bindings.length) {
				throw new Error(`Duplicate private argument name: ${key}`);
			}
			this.bindings.set(key, definition.bindings);
		}
	}

	async resolve(input: Parameters<ToolArgumentResolver["resolve"]>[0]) {
		if (
			input.arguments === null ||
			typeof input.arguments !== "object" ||
			Array.isArray(input.arguments)
		) {
			throw new Error("Tool arguments must be an object");
		}

		const currentSession = await this.sessions.get(
			input.context.session.sessionId,
		);
		if (
			!currentSession ||
			currentSession.userId !== input.context.session.userId ||
			currentSession.tenantId !== input.context.session.tenantId ||
			currentSession.sessionVersion !== input.context.session.sessionVersion
		) {
			throw new Error("Session changed before private argument resolution");
		}

		const resolved: Record<string, unknown> = { ...input.arguments };
		const bindings =
			this.bindings.get(
				this.key(input.definition.id, input.definition.version),
			) ?? [];
		for (const binding of bindings) {
			const handle = resolved[binding.argumentName];
			if (typeof handle !== "string" || handle.length === 0) {
				throw new Error("Private argument must contain an opaque handle");
			}
			resolved[binding.argumentName] = await this.broker.resolveHandle({
				session: currentSession,
				handle,
				toolId: input.definition.id,
				audience: binding.audience,
				purpose: binding.purpose,
			});
		}
		return resolved;
	}

	private key(toolId: string, version: string): string {
		return `${toolId}@${version}`;
	}
}
