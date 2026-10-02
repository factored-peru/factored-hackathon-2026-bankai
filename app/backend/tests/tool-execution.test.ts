import { describe, expect, test } from "bun:test";
import { z } from "zod";
import type { PolicyDecision } from "../src/domain/control/contracts.js";
import type { SessionContext } from "../src/domain/session.js";
import type { ToolDefinition } from "../src/domain/tools/contracts.js";
import { InMemoryIdempotencyStore } from "../src/integrations/memory/in-memory-control-stores.js";
import { StaticToolRegistry } from "../src/integrations/tools/static-tool-registry.js";
import type {
	ToolArgumentResolver,
	ToolExecutor,
} from "../src/services/ports/tools.js";
import { ToolExecutionService } from "../src/services/tools/tool-execution-service.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["customer"],
	capabilities: ["movements:read"],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

const allow: PolicyDecision = {
	outcome: "ALLOW",
	decisionId: "decision-a",
	policyId: "policy-a",
	policyVersion: "1",
	riskLevel: "low",
	reasons: [],
};

const definition: ToolDefinition = {
	id: "get_movements",
	version: "1",
	capability: "movements:read",
	sideEffect: "none",
	risk: "low",
	idempotency: "required",
	timeoutMs: 100,
	approval: "never",
	inputSchema: z.object({ accountRef: z.string() }).strict(),
	outputSchema: z.object({ count: z.number() }).strict(),
};

function setup(output: unknown = { count: 2 }) {
	let resolves = 0;
	let executions = 0;
	const resolver: ToolArgumentResolver = {
		resolve: async ({ arguments: value }) => {
			resolves += 1;
			return value;
		},
	};
	const executor: ToolExecutor = {
		execute: async () => {
			executions += 1;
			return output;
		},
	};
	const service = new ToolExecutionService(
		new StaticToolRegistry([definition]),
		resolver,
		executor,
		new InMemoryIdempotencyStore(),
	);
	return {
		service,
		counts: () => ({ resolves, executions }),
	};
}

const context = {
	session,
	traceId: "trace-a",
	workflowId: null,
	decisionId: "decision-a",
};

describe("tool execution mediation", () => {
	test("does not resolve private arguments when policy denies", async () => {
		const { service, counts } = setup();
		const result = await service.execute({
			call: {
				toolId: "get_movements",
				version: "1",
				arguments: { accountRef: "opaque-ref" },
				idempotencyKey: "key-a",
			},
			context,
			policyDecision: { ...allow, outcome: "DENY" },
			approvalSatisfied: false,
		});

		expect(result).toEqual({
			status: "rejected",
			reasonCode: "policy_not_allowed",
		});
		expect(counts()).toEqual({ resolves: 0, executions: 0 });
	});

	test("rejects extra fields before resolving handles", async () => {
		const { service, counts } = setup();
		const result = await service.execute({
			call: {
				toolId: "get_movements",
				version: "1",
				arguments: { accountRef: "opaque-ref", hidden: "value" },
				idempotencyKey: "key-a",
			},
			context,
			policyDecision: allow,
			approvalSatisfied: false,
		});

		expect(result.status).toBe("rejected");
		expect(counts()).toEqual({ resolves: 0, executions: 0 });
	});

	test("replays the original output for the same idempotent payload", async () => {
		const { service, counts } = setup();
		const request = {
			call: {
				toolId: "get_movements",
				version: "1",
				arguments: { accountRef: "opaque-ref" },
				idempotencyKey: "key-a",
			},
			context,
			policyDecision: allow,
			approvalSatisfied: false,
		} as const;

		expect(await service.execute(request)).toMatchObject({
			status: "succeeded",
			replay: false,
		});
		expect(await service.execute(request)).toMatchObject({
			status: "succeeded",
			replay: true,
		});
		expect(counts()).toEqual({ resolves: 1, executions: 1 });
	});

	test("treats invalid output after a side effect as indeterminate", async () => {
		const effectful = {
			...definition,
			id: "write_case",
			sideEffect: "reversible" as const,
			approval: "policy" as const,
		};
		const service = new ToolExecutionService(
			new StaticToolRegistry([effectful]),
			{ resolve: async ({ arguments: value }) => value },
			{ execute: async () => ({ unexpected: true }) },
			new InMemoryIdempotencyStore(),
		);

		const result = await service.execute({
			call: {
				toolId: "write_case",
				version: "1",
				arguments: { accountRef: "opaque-ref" },
				idempotencyKey: "key-write",
			},
			context,
			policyDecision: allow,
			approvalSatisfied: true,
		});

		expect(result).toEqual({
			status: "indeterminate",
			reasonCode: "invalid_tool_output",
		});
	});

	test("does not mark an effect indeterminate when handle resolution fails first", async () => {
		const effectful = {
			...definition,
			id: "write_case",
			sideEffect: "reversible" as const,
		};
		let executions = 0;
		const service = new ToolExecutionService(
			new StaticToolRegistry([effectful]),
			{
				resolve: async () => {
					throw new Error("expired handle");
				},
			},
			{
				execute: async () => {
					executions += 1;
					return { count: 1 };
				},
			},
			new InMemoryIdempotencyStore(),
		);

		expect(
			await service.execute({
				call: {
					toolId: "write_case",
					version: "1",
					arguments: { accountRef: "expired-ref" },
					idempotencyKey: "key-expired",
				},
				context,
				policyDecision: allow,
				approvalSatisfied: true,
			}),
		).toEqual({
			status: "failed",
			reasonCode: "private_argument_resolution_failed",
		});
		expect(executions).toBe(0);
	});

	test("enforces the registered tool timeout", async () => {
		const service = new ToolExecutionService(
			new StaticToolRegistry([{ ...definition, timeoutMs: 1 }]),
			{ resolve: async ({ arguments: value }) => value },
			{ execute: async () => new Promise<unknown>(() => undefined) },
			new InMemoryIdempotencyStore(),
		);

		expect(
			await service.execute({
				call: {
					toolId: "get_movements",
					version: "1",
					arguments: { accountRef: "ref-a" },
					idempotencyKey: "key-timeout",
				},
				context,
				policyDecision: allow,
				approvalSatisfied: false,
			}),
		).toEqual({ status: "failed", reasonCode: "tool_timeout" });
	});
});
