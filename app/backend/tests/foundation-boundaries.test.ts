import { describe, expect, test } from "bun:test";
import { defaultAgentBudget } from "../src/domain/control/contracts.js";
import { safeAuditEventSchema } from "../src/domain/observability/audit-event.js";
import type { SessionContext } from "../src/domain/session.js";
import {
	BudgetExceededError,
	BudgetTracker,
} from "../src/services/control-plane/budget-tracker.js";
import { QueryPlanService } from "../src/services/data/query-plan-service.js";
import type { GuardrailProvider } from "../src/services/ports/control.js";
import type { KnowledgeRetriever } from "../src/services/ports/retrieval.js";
import { RetrievalService } from "../src/services/retrieval/retrieval-service.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

const allowGuardrail: GuardrailProvider = {
	inspect: async ({ traceId }) => ({
		provider: "test",
		status: "NO_MATCH_FOUND",
		action: "allow",
		templateVersion: "1",
		traceId,
	}),
};

function chunk(tenantId = "tenant-a") {
	return {
		content: "Approved policy text",
		tenantId,
		documentId: "document-a",
		sourceId: "policy-manual",
		sourceType: "manual",
		documentVersion: "1",
		classification: "internal" as const,
		createdAt: "2026-01-01T00:00:00.000Z",
		contentHash: "hash-a",
	};
}

describe("foundation boundaries", () => {
	test("injects tenant and source constraints into retrieval", async () => {
		let receivedTenant = "";
		const retriever: KnowledgeRetriever = {
			search: async (query) => {
				receivedTenant = query.tenantId;
				return [chunk()];
			},
		};
		const service = new RetrievalService(retriever, allowGuardrail);

		const result = await service.retrieve({
			query: "policy",
			session,
			maxChunks: 3,
			allowedSources: ["policy-manual"],
			traceId: "trace-a",
		});

		expect(receivedTenant).toBe("tenant-a");
		expect(result).toMatchObject({ status: "succeeded" });
	});

	test("blocks cross-tenant chunks and guardrail failure", async () => {
		const crossTenant = new RetrievalService(
			{ search: async () => [chunk("tenant-b")] },
			allowGuardrail,
		);
		expect(
			await crossTenant.retrieve({
				query: "policy",
				session,
				maxChunks: 3,
				allowedSources: ["policy-manual"],
				traceId: "trace-a",
			}),
		).toEqual({ status: "blocked", reasonCode: "retrieval_scope_violation" });

		const failedGuardrail = new RetrievalService(
			{ search: async () => [chunk()] },
			{
				inspect: async ({ traceId }) => ({
					provider: "test",
					status: "FAILURE",
					action: "block",
					templateVersion: "1",
					traceId,
				}),
			},
		);
		expect(
			await failedGuardrail.retrieve({
				query: "policy",
				session,
				maxChunks: 3,
				allowedSources: ["policy-manual"],
				traceId: "trace-a",
			}),
		).toEqual({
			status: "blocked",
			reasonCode: "retrieval_guardrail_failure",
		});
	});

	test("accepts only closed allowlisted query plans", () => {
		const service = new QueryPlanService();
		expect(
			service.validate({
				operation: "select",
				resource: "employee_movements",
				fields: ["movement_id", "status"],
				filters: [{ field: "employee_id", operator: "eq", value: "e-1" }],
				orderBy: null,
				limit: 20,
			}),
		).toMatchObject({ status: "valid" });
		expect(service.validate({ sql: "DELETE FROM movements" })).toEqual({
			status: "invalid",
			reasonCode: "invalid_query_plan",
		});
	});

	test("audit schema rejects content-bearing fields", () => {
		const safe = {
			event: "decision",
			traceId: "trace-a",
			workflowId: null,
			decisionId: "decision-a",
			policyId: "policy-a",
			policyVersion: "1",
			toolId: null,
			toolVersion: null,
			guardrailProvider: null,
			guardrailStatus: null,
			templateVersion: null,
			riskLevel: "low" as const,
			sessionHash: "session-hash",
			tenantHash: "tenant-hash",
			outcome: "allow",
			occurredAt: "2026-01-01T00:00:00.000Z",
		};
		expect(safeAuditEventSchema.safeParse(safe).success).toBe(true);
		expect(
			safeAuditEventSchema.safeParse({ ...safe, prompt: "private prompt" })
				.success,
		).toBe(false);
	});

	test("enforces structural and wall-time budgets", () => {
		let now = 0;
		const tracker = new BudgetTracker(
			{ ...defaultAgentBudget, maxToolCalls: 1, maxWallTimeMs: 10 },
			() => now,
		);
		tracker.consume("toolCalls");
		expect(() => tracker.consume("toolCalls")).toThrow(BudgetExceededError);

		const wallClock = new BudgetTracker(defaultAgentBudget, () => now);
		now = defaultAgentBudget.maxWallTimeMs + 1;
		expect(() => wallClock.assertWallTime()).toThrow(BudgetExceededError);
	});
});
