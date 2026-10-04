import { afterAll, describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { envSchema } from "../src/config/env.js";
import type { SessionContext } from "../src/domain/session.js";
import type { BigQueryClientLike } from "../src/integrations/bigquery/bigquery-query-executor.js";
import {
	createStructuredQueryRuntime,
	createStructuredRag,
} from "../src/integrations/bigquery/structured-rag-runtime.js";
import { StaticCustomerIdentityResolver } from "../src/integrations/identity/static-customer-identity-resolver.js";

const directory = mkdtempSync(join(tmpdir(), "structured-runtime-"));
afterAll(() => rmSync(directory, { recursive: true, force: true }));

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

// Placeholders are resolved from configuration, so no project is named in the file.
const catalog = {
	kind: "structured",
	version: "runtime-1",
	entries: [
		{
			queryId: "product_status",
			version: "v1",
			description: "Status of one product owned by the customer.",
			sql: "SELECT product_id, product_status FROM `{project}.{dataset}.products` WHERE customer_id = @customer_id AND product_id = @product_id LIMIT 1",
			parameters: [
				{
					name: "customer_id",
					source: "session",
					type: "string",
					binding: "customer_id",
				},
				{
					name: "product_id",
					source: "caller",
					type: "string",
					required: true,
					maxLength: 64,
					format: "identifier",
				},
			],
			columns: [
				{ name: "product_id", type: "string", classification: "financial" },
				{ name: "product_status", type: "string", classification: "financial" },
			],
			relations: [],
			allowedRoles: ["customer"],
			maxRows: 1,
			maximumBytesBilled: 50_000_000,
		},
	],
};
const catalogPath = join(directory, "catalog.json");
writeFileSync(catalogPath, JSON.stringify(catalog));

const settings = envSchema.parse({
	BIGQUERY_ENABLED: true,
	GOOGLE_CLOUD_PROJECT: "proj",
	GOOGLE_CLOUD_LOCATION: "us-central1",
	BIGQUERY_DATASET: "data",
	BIGQUERY_JOB_TIMEOUT_MS: 5000,
	STRUCTURED_CATALOG_PATH: catalogPath,
});

function fakeClient() {
	const jobs: Parameters<BigQueryClientLike["createQueryJob"]>[0][] = [];
	const client: BigQueryClientLike = {
		async createQueryJob(options) {
			jobs.push(options);
			return {
				jobId: "job-1",
				schema: null,
				totalBytesProcessed: 100,
				getRows: async () => ({
					rows: [{ product_id: "p-1", product_status: "active" }],
					totalBytesProcessed: 100,
				}),
			};
		},
	};
	return { client, jobs };
}

describe("Structured RAG runtime", () => {
	test("fails closed when BigQuery is disabled", async () => {
		await expect(
			createStructuredQueryRuntime({ ...settings, BIGQUERY_ENABLED: false }),
		).rejects.toThrow("structured_runtime_disabled");
	});

	test("builds the adapters without opening a connection", async () => {
		const runtime = await createStructuredQueryRuntime(settings);

		expect(runtime.options).toEqual({ project: "proj", dataset: "data" });
		expect(runtime.catalog.kind).toBe("structured");
	});

	test("serves a catalog file and runs it end to end with the configured names", async () => {
		const { client, jobs } = fakeClient();
		const { rag, catalog: repository } = await createStructuredRag(
			settings,
			{
				selector: {
					select: async () => ({
						decision: "select",
						queryId: "product_status",
						version: "v1",
						parameters: { product_id: "p-1" },
					}),
				},
				identity: new StaticCustomerIdentityResolver([
					{ tenantId: "tenant-a", userId: "user-a", customerId: "customer-1" },
				]),
			},
			{ client },
		);

		const loaded = await repository.load({ session, traceId: "t" });
		expect(loaded.status).toBe("ready");
		if (loaded.status !== "ready") {
			return;
		}
		const result = await rag.execute({
			query: "status of my card",
			session,
			catalog: loaded.catalog,
			traceId: "t",
		});

		expect(result.status).toBe("ready");
		expect(jobs[0]).toMatchObject({
			// The placeholders were resolved from configuration.
			query: expect.stringContaining("`proj.data.products`"),
			params: { customer_id: "customer-1", product_id: "p-1" },
			location: "us-central1",
			jobTimeoutMs: 5000,
			maximumBytesBilled: "50000000",
		});
	});

	test("an unreadable catalog path makes the catalog unavailable, not partial", async () => {
		const { client } = fakeClient();
		const { catalog: repository } = await createStructuredRag(
			{ ...settings, STRUCTURED_CATALOG_PATH: join(directory, "missing.json") },
			{
				selector: { select: async () => ({ decision: "deny" }) },
				identity: new StaticCustomerIdentityResolver([]),
			},
			{ client },
		);

		expect(await repository.load({ session, traceId: "t" })).toEqual({
			status: "unavailable",
			reasonCode: "structured_catalog_unavailable",
		});
	});
});
