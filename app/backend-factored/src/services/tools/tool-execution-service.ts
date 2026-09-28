import type { PolicyDecision } from "../../domain/control/contracts.js";
import type {
	ProposedToolCall,
	ToolExecutionContext,
	ToolExecutionResult,
} from "../../domain/tools/contracts.js";
import { stableHash } from "../control-plane/stable-hash.js";
import type {
	IdempotencyStore,
	ToolArgumentResolver,
	ToolExecutor,
	ToolRegistry,
} from "../ports/tools.js";

class ToolTimeoutError extends Error {}

async function withTimeout<T>(
	operation: Promise<T>,
	timeoutMs: number,
): Promise<T> {
	let timeout: ReturnType<typeof setTimeout> | undefined;
	try {
		return await Promise.race([
			operation,
			new Promise<never>((_, reject) => {
				timeout = setTimeout(() => reject(new ToolTimeoutError()), timeoutMs);
			}),
		]);
	} finally {
		if (timeout !== undefined) {
			clearTimeout(timeout);
		}
	}
}

export class ToolExecutionService {
	constructor(
		private readonly registry: ToolRegistry,
		private readonly argumentResolver: ToolArgumentResolver,
		private readonly executor: ToolExecutor,
		private readonly idempotencyStore: IdempotencyStore,
	) {}

	async execute(input: {
		call: ProposedToolCall;
		context: ToolExecutionContext;
		policyDecision: PolicyDecision;
		approvalSatisfied: boolean;
	}): Promise<ToolExecutionResult> {
		if (input.policyDecision.outcome !== "ALLOW") {
			return { status: "rejected", reasonCode: "policy_not_allowed" };
		}

		const definition = this.registry.get(input.call.toolId, input.call.version);
		if (!definition) {
			return { status: "rejected", reasonCode: "unknown_tool_or_version" };
		}
		if (!input.context.session.capabilities.includes(definition.capability)) {
			return { status: "rejected", reasonCode: "insufficient_capability" };
		}
		if (
			(definition.approval === "always" ||
				definition.sideEffect === "irreversible") &&
			!input.approvalSatisfied
		) {
			return { status: "rejected", reasonCode: "approval_required" };
		}

		const proposedArguments = definition.inputSchema.safeParse(
			input.call.arguments,
		);
		if (!proposedArguments.success) {
			return { status: "rejected", reasonCode: "invalid_tool_arguments" };
		}

		const payloadHash = stableHash({
			toolId: definition.id,
			version: definition.version,
			arguments: input.call.arguments,
		});
		const storageKey = input.call.idempotencyKey
			? stableHash({
					tenantId: input.context.session.tenantId,
					toolId: definition.id,
					key: input.call.idempotencyKey,
				})
			: null;

		if (definition.idempotency === "required" && storageKey === null) {
			return { status: "rejected", reasonCode: "idempotency_key_required" };
		}
		if (storageKey !== null) {
			const claim = await this.idempotencyStore.claim(storageKey, payloadHash);
			if (claim.status === "replay") {
				return { status: "succeeded", output: claim.result, replay: true };
			}
			if (claim.status === "conflict") {
				return { status: "rejected", reasonCode: "idempotency_key_conflict" };
			}
			if (claim.status === "in_progress") {
				return { status: "rejected", reasonCode: "idempotency_in_progress" };
			}
		}

		let resolvedArguments: unknown;
		try {
			resolvedArguments = await this.argumentResolver.resolve({
				definition,
				arguments: proposedArguments.data,
				context: input.context,
			});
		} catch {
			if (storageKey !== null) {
				await this.idempotencyStore.release(storageKey, payloadHash);
			}
			return {
				status: "failed",
				reasonCode: "private_argument_resolution_failed",
			};
		}

		try {
			const rawOutput = await withTimeout(
				this.executor.execute({
					definition,
					arguments: resolvedArguments,
					context: input.context,
				}),
				definition.timeoutMs,
			);
			const output = definition.outputSchema.safeParse(rawOutput);
			if (!output.success) {
				return await this.executionFailure(
					definition.sideEffect,
					storageKey,
					payloadHash,
					"invalid_tool_output",
				);
			}
			if (storageKey !== null) {
				await this.idempotencyStore.complete(
					storageKey,
					payloadHash,
					output.data,
				);
			}
			return { status: "succeeded", output: output.data, replay: false };
		} catch (error) {
			return this.executionFailure(
				definition.sideEffect,
				storageKey,
				payloadHash,
				error instanceof ToolTimeoutError
					? "tool_timeout"
					: "tool_execution_failed",
			);
		}
	}

	private async executionFailure(
		sideEffect: "none" | "reversible" | "irreversible",
		storageKey: string | null,
		payloadHash: string,
		reasonCode: string,
	): Promise<ToolExecutionResult> {
		if (storageKey !== null) {
			if (sideEffect === "none") {
				await this.idempotencyStore.release(storageKey, payloadHash);
			} else {
				await this.idempotencyStore.markIndeterminate(storageKey, payloadHash);
			}
		}
		return sideEffect === "none"
			? { status: "failed", reasonCode }
			: { status: "indeterminate", reasonCode };
	}
}
