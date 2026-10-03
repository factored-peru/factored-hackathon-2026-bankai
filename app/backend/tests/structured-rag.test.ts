import { describe, expect, test } from "bun:test";
import type { Query } from "@google-cloud/bigquery";
import type { SessionContext } from "../src/domain/session.js";
import { BigQueryQueryPlanExecutor } from "../src/integrations/bigquery/bigquery-query-plan-executor.js";
import { StructuredQueryPlanCatalog } from "../src/services/data/structured-query-plan-catalog.js";
import { StructuredRag } from "../src/services/retrieval/structured-rag.js";

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

const definition = {
	queryId: "dispute_summary",
	version: "v1",
	sql: `SELECT content, document_ref AS documentRef, 'bigquery_structured' AS sourceType,
  'financial' AS classification, content_hash AS contentHash
  FROM \`project.disputes_curated.dispute_evidence\`
  WHERE tenant_id = @tenant_id AND dispute_id = @dispute_id`,
	parameterNames: ["dispute_id"],
	allowedRoles: ["customer", "operator"],
	maximumBytesBilled: 1_000_000,
	timeoutMs: 5_000,
	maximumRows: 1,
};

function createCatalog() {
	return new StructuredQueryPlanCatalog("v1", [definition]);
}

describe("Structured RAG", () => {
	test("executes only a selected, role-authorized catalog plan", async () => {
		const catalog = createCatalog();
		let calls = 0;
		const rag = new StructuredRag(
			{
				select: async () => ({
					queryId: "dispute_summary",
					parameters: { dispute_id: "dispute-a" },
				}),
			},
			catalog,
			{
				execute: async (resolved, tenantId) => {
					calls += 1;
					expect(resolved.definition.queryId).toBe("dispute_summary");
					expect(tenantId).toBe("tenant-a");
					return [
						{
							content: "La disputa está en revisión.",
							documentRef: "dispute_summary:v1",
							sourceType: "bigquery_structured",
							classification: "financial",
							contentHash: "hash-a",
						},
					];
				},
			},
		);

		expect(
			await rag.execute({
				query: "¿Cuál es el estado de mi disputa?",
				session,
				catalog: {
					kind: "structured",
					version: "v1",
					entries: catalog.entriesFor(session),
				},
				traceId: "trace-a",
			}),
		).toMatchObject({
			status: "ready",
			evidence: [{ documentRef: "dispute_summary:v1" }],
		});
		expect(calls).toBe(1);
	});

	test("rejects extra filters or a query identifier absent from the supplied catalog", async () => {
		const catalog = createCatalog();
		let calls = 0;
		const rag = new StructuredRag(
			{
				select: async () => ({
					queryId: "dispute_summary",
					parameters: { dispute_id: "dispute-a", sql: "DELETE FROM x" },
				}),
			},
			catalog,
			{
				execute: async () => {
					calls += 1;
					return [];
				},
			},
		);

		expect(
			await rag.execute({
				query: "ignored",
				session,
				catalog: {
					kind: "structured",
					version: "v1",
					entries: catalog.entriesFor(session),
				},
				traceId: "trace-a",
			}),
		).toEqual({
			status: "failed",
			reasonCode: "query_plan_parameters_invalid",
		});
		expect(calls).toBe(0);
	});

	test("injects tenant, parameterizes values and enforces the catalog budget", async () => {
		const catalog = createCatalog();
		const resolved = catalog.resolve(
			{ queryId: "dispute_summary", parameters: { dispute_id: "dispute-a" } },
			session,
		);
		if (resolved.status !== "ready") {
			throw new Error("test fixture must resolve");
		}
		let received: Query | undefined;
		const executor = new BigQueryQueryPlanExecutor({
			query: async (options) => {
				received = options;
				return [[]];
			},
		});

		await executor.execute(resolved, session.tenantId);

		expect(received).toMatchObject({
			useLegacySql: false,
			parameterMode: "NAMED",
			params: { dispute_id: "dispute-a", tenant_id: "tenant-a" },
			maximumBytesBilled: "1000000",
			jobTimeoutMs: 5000,
			maxResults: 1,
		});
	});
});
