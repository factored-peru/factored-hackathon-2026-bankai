import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encode } from "@msgpack/msgpack";
import { envSchema } from "../src/config/env.js";
import { buildServer } from "../src/http/server.js";

function sha(content: Uint8Array): string {
	return createHash("sha256").update(content).digest("hex");
}

async function publishFixture(root: string, runId: string, label: string) {
	const version = join(root, "demo-bankai", runId);
	await mkdir(version, { recursive: true });
	const graph = {
		format: "bankai-kdd-graph",
		schema_version: "bankai-kdd-graph-v1",
		source: {
			kdd_run_id: `kdd-${label}`,
			case_catalog_version: "bankai-dispute-kg-cases-v1",
		},
		nodes: [
			{
				id: "population:transactions",
				kind: "population",
				attributes: { name: "transactions", target: "transaction_status" },
			},
			{
				id: `rule:transactions:${label}`,
				kind: "rule",
				attributes: { population: "transactions", label },
			},
		],
		edges: [
			{
				source: "population:transactions",
				target: `rule:transactions:${label}`,
				relation: "contains",
				attributes: {},
			},
		],
	};
	const graphBytes = Buffer.from(encode(graph));
	const catalogVersion = `kg-v1-${label}`;
	const manifest = Buffer.from(
		JSON.stringify({
			schema_version: "bankai-kdd-graph-v1",
			run_id: runId,
			graph_file: "graph-v1.msgpack",
			graph_sha256: sha(graphBytes),
			source: graph.source,
		}),
	);
	const catalog = Buffer.from(
		JSON.stringify({
			schema_version: "bankai-kg-operation-catalog-v1",
			kind: "knowledge_graph",
			version: catalogVersion,
			graph_schema_version: "bankai-kdd-graph-v1",
			operations: [
				{
					id: "kg.population.summary",
					version: "v1",
					description: "population",
					allowedRoles: ["backoffice", "customer"],
					parameters: [
						{
							name: "population",
							type: "string",
							allowedValues: ["transactions"],
						},
					],
				},
			],
		}),
	);
	await writeFile(join(version, "graph-v1.msgpack"), graphBytes);
	await writeFile(join(version, "graph-manifest.json"), manifest);
	await writeFile(join(version, "kg-operation-catalog.json"), catalog);
	return {
		runId,
		catalogVersion,
		pointer: {
			schema_version: "bankai-local-kg-publication-v1",
			tenant_id: "demo-bankai",
			run_id: runId,
			catalog_version: catalogVersion,
			artifact_dir: runId,
			files: {
				"graph-v1.msgpack": sha(graphBytes),
				"graph-manifest.json": sha(manifest),
				"kg-operation-catalog.json": sha(catalog),
			},
			provenance: {
				kdd_run_id: `kdd-${label}`,
				case_catalog_version: "bankai-dispute-kg-cases-v1",
			},
		},
	};
}

describe("admin KG API", () => {
	test("backoffice can inspect, promote and rollback published packages", async () => {
		const root = await mkdtemp(join(tmpdir(), "bankai-kg-admin-"));
		try {
			const older = await publishFixture(root, "graph-admin-a", "a");
			const newer = await publishFixture(root, "graph-admin-b", "b");
			await writeFile(
				join(root, "demo-bankai", "current.json"),
				JSON.stringify(older.pointer),
			);
			const runtimeEnv = envSchema.parse({
				APP_ENV: "dev",
				DEMO_AUTH_ENABLED: true,
				KG_RAG_LOCAL_ENABLED: true,
				KG_RAG_LOCAL_ARTIFACT_DIR: root,
				KG_RAG_LOCAL_TENANT_ID: "demo-bankai",
			});
			const app = await buildServer({ env: runtimeEnv });
			const customerLogin = await app.inject({
				method: "POST",
				url: "/v1/demo/sessions",
				payload: { actorId: "demo-customer-1" },
			});
			const customerCookie = Array.isArray(customerLogin.headers["set-cookie"])
				? customerLogin.headers["set-cookie"][0]
				: customerLogin.headers["set-cookie"];
			const denied = await app.inject({
				method: "GET",
				url: "/v1/admin/kg/current",
				headers: { cookie: customerCookie ?? "" },
			});
			expect(denied.statusCode).toBe(403);

			const login = await app.inject({
				method: "POST",
				url: "/v1/demo/sessions",
				payload: { actorId: "demo-backoffice-1" },
			});
			const cookie = Array.isArray(login.headers["set-cookie"])
				? login.headers["set-cookie"][0]
				: login.headers["set-cookie"];
			const current = await app.inject({
				method: "GET",
				url: "/v1/admin/kg/current",
				headers: { cookie: cookie ?? "" },
			});
			expect(current.statusCode).toBe(200);
			expect(current.json().run_id).toBe(older.runId);

			const versions = await app.inject({
				method: "GET",
				url: "/v1/admin/kg/versions",
				headers: { cookie: cookie ?? "" },
			});
			expect(versions.statusCode).toBe(200);
			expect(versions.json().versions).toHaveLength(2);

			const diff = await app.inject({
				method: "GET",
				url: `/v1/admin/kg/diff?from=${older.runId}&to=${newer.runId}`,
				headers: { cookie: cookie ?? "" },
			});
			expect(diff.statusCode).toBe(200);
			expect(diff.json().identical).toBe(false);

			const promote = await app.inject({
				method: "POST",
				url: "/v1/admin/kg/promote",
				headers: { cookie: cookie ?? "" },
				payload: { run_id: newer.runId },
			});
			expect(promote.statusCode).toBe(200);
			expect(promote.json().run_id).toBe(newer.runId);

			const rollback = await app.inject({
				method: "POST",
				url: "/v1/admin/kg/rollback",
				headers: { cookie: cookie ?? "" },
				payload: { to_run_id: older.runId },
			});
			expect(rollback.statusCode).toBe(200);
			expect(rollback.json().run_id).toBe(older.runId);
			await app.close();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
