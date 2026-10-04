import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { SessionContext } from "../src/domain/session.js";
import { BaselineQueryTool } from "../src/services/baseline/baseline-query-tool.js";
import { baselineRetrievalToolName } from "../src/services/ports/baseline-chat.js";

const session: SessionContext = {
	sessionId: "session-1",
	userId: "actor-1",
	tenantId: "tenant-1",
	roles: ["backoffice"],
	capabilities: [],
	scopes: [],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	revokedAt: null,
	expiresAt: "2026-01-01T00:00:00.000Z",
};

describe("BaselineQueryTool", () => {
	test("uses an example QueryPlan with server-derived customer scope", async () => {
		const executions: unknown[] = [];
		const tool = new BaselineQueryTool({
			source: {
				async read() {
					return JSON.parse(
						await readFile(
							resolve(
								import.meta.dir,
								"../config/structured-catalog.example.json",
							),
							"utf8",
						),
					);
				},
			},
			options: { project: "project", dataset: "dataset" },
			identity: {
				async resolve() {
					return "customer-derived-on-server";
				},
			},
			executor: {
				async execute(input) {
					executions.push(input);
					return {
						status: "ready" as const,
						rows: [{ product_id: "p-1", product_status: "active" }],
						jobId: "job-1",
						bytesProcessed: 50,
						durationMs: 2,
					};
				},
			},
		});

		const definition = await tool.describe();
		expect(definition.description).toContain("customer_products");
		expect(definition.description).toContain("recent_transactions");
		const result = await tool.retrieve({
			call: {
				name: baselineRetrievalToolName,
				args: { queryId: "customer_products", version: "v1", parameters: {} },
				callId: "call-1",
			},
			session,
			traceId: "trace-1",
		});

		expect(result).toEqual(
			expect.objectContaining({
				status: "ready",
				rowCount: 1,
				rows: [{ product_id: "p-1", product_status: "active" }],
			}),
		);
		expect(executions).toEqual([
			expect.objectContaining({
				parameters: { customer_id: "customer-derived-on-server" },
			}),
		]);
	});

	test("rejects a model attempt to provide the session customer identifier", async () => {
		const tool = new BaselineQueryTool({
			source: {
				async read() {
					return exampleCatalog();
				},
			},
			options: { project: "project", dataset: "dataset" },
			identity: {
				async resolve() {
					return "customer-derived-on-server";
				},
			},
			executor: {
				async execute() {
					throw new Error("must_not_execute");
				},
			},
		});

		const result = await tool.retrieve({
			call: {
				name: baselineRetrievalToolName,
				args: {
					queryId: "customer_products",
					version: "v1",
					parameters: { customer_id: "model-value" },
				},
				callId: "call-1",
			},
			session,
			traceId: "trace-1",
		});

		expect(result).toEqual(
			expect.objectContaining({
				status: "failed",
				reasonCode: "query_parameter_not_allowed",
			}),
		);
	});
});

function exampleCatalog() {
	return {
		kind: "structured",
		version: "v1",
		entries: [
			{
				queryId: "customer_products",
				version: "v1",
				description: "Products for the authenticated customer.",
				sql: "SELECT product_id FROM `project.dataset.products` WHERE customer_id = @customer_id LIMIT 1",
				parameters: [
					{
						name: "customer_id",
						source: "session",
						type: "string",
						binding: "customer_id",
					},
				],
				columns: [
					{ name: "product_id", type: "string", classification: "financial" },
				],
				relations: [],
				allowedRoles: ["customer"],
				maxRows: 1,
				maximumBytesBilled: 1000,
			},
		],
	};
}
