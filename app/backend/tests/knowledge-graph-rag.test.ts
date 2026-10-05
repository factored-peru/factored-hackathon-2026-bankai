import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encode } from "@msgpack/msgpack";
import type { SessionContext } from "../src/domain/session.js";
import {
	createGcsKnowledgeGraphRuntime,
	GcsKnowledgeGraphArtifactRepository,
	normalizeArtifactPrefix,
} from "../src/integrations/kg/gcs-knowledge-graph-artifact-repository.js";
import { LocalKnowledgeGraphArtifactRepository } from "../src/integrations/kg/local-knowledge-graph-runtime.js";
import { KnowledgeGraphRag } from "../src/services/retrieval/knowledge-graph-rag.js";

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

function sha(content: Uint8Array): string {
	return createHash("sha256").update(content).digest("hex");
}

async function fixture(corrupt = false) {
	const root = await mkdtemp(join(tmpdir(), "bankai-kg-"));
	const run = "graph-fixture-2026";
	const version = join(root, "demo-bankai", run);
	await mkdir(version, { recursive: true });
	const graph = {
		format: "bankai-kdd-graph",
		schema_version: "bankai-kdd-graph-v1",
		source: {
			kdd_run_id: "kdd-fixture-2026",
			case_catalog_version: "bankai-dispute-kg-cases-v1",
		},
		nodes: [
			{
				id: "case:C1",
				kind: "case",
				attributes: {
					case_id: "C1",
					status: "exploratory_not_promoted",
					target: "sla_breached",
					predictors: ["priority"],
					limitation: "No threshold.",
				},
			},
			{
				id: "population:transactions",
				kind: "population",
				attributes: { name: "transactions", target: "transaction_status" },
			},
			{
				id: "value:transactions:channel=POS",
				kind: "feature_value",
				attributes: { feature: "channel", value: "POS" },
			},
			{
				id: "target:transactions:transaction_status=DECLINED",
				kind: "target",
				attributes: { feature: "transaction_status", value: "DECLINED" },
			},
			{
				id: "rule:transactions:1",
				kind: "rule",
				attributes: { population: "transactions" },
			},
		],
		edges: [
			{
				source: "case:C1",
				target: "population:transactions",
				relation: "applies_to",
				attributes: {},
			},
			{
				source: "value:transactions:channel=POS",
				target: "rule:transactions:1",
				relation: "antecedent",
				attributes: {},
			},
			{
				source: "rule:transactions:1",
				target: "target:transactions:transaction_status=DECLINED",
				relation: "predicts",
				attributes: {
					support: 0.4,
					confidence: 0.8,
					lift: 1.6,
					algorithms: ["apriori", "fpgrowth"],
				},
			},
		],
	};
	const graphBytes = Buffer.from(encode(graph));
	const manifest = Buffer.from(
		JSON.stringify({
			schema_version: "bankai-kdd-graph-v1",
			run_id: run,
			graph_file: "graph-v1.msgpack",
			graph_sha256: sha(graphBytes),
			source: graph.source,
		}),
	);
	const catalog = Buffer.from(
		JSON.stringify({
			schema_version: "bankai-kg-operation-catalog-v1",
			kind: "knowledge_graph",
			version: "kg-v1-fixture",
			graph_schema_version: "bankai-kdd-graph-v1",
			operations: [
				{
					id: "kg.case.summary",
					version: "v1",
					description: "case",
					allowedRoles: ["customer"],
					parameters: [
						{ name: "case_id", type: "string", allowedValues: ["C1"] },
					],
				},
				{
					id: "kg.population.summary",
					version: "v1",
					description: "population",
					allowedRoles: ["customer"],
					parameters: [
						{
							name: "population",
							type: "string",
							allowedValues: ["transactions"],
						},
					],
				},
				{
					id: "kg.rules.by-target",
					version: "v1",
					description: "target",
					allowedRoles: ["customer"],
					parameters: [
						{
							name: "target",
							type: "string",
							allowedValues: ["transaction_status=DECLINED"],
						},
						{
							name: "population",
							type: "string",
							allowedValues: ["transactions"],
						},
					],
				},
				{
					id: "kg.rules.by-feature-value",
					version: "v1",
					description: "feature",
					allowedRoles: ["customer"],
					parameters: [
						{ name: "item", type: "string", allowedValues: ["channel=POS"] },
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
	const current = {
		schema_version: "bankai-local-kg-publication-v1",
		tenant_id: "demo-bankai",
		run_id: run,
		catalog_version: "kg-v1-fixture",
		artifact_dir: run,
		files: {
			"graph-v1.msgpack": corrupt ? "0".repeat(64) : sha(graphBytes),
			"graph-manifest.json": sha(manifest),
			"kg-operation-catalog.json": sha(catalog),
		},
		provenance: {
			kdd_run_id: "kdd-fixture-2026",
			case_catalog_version: "bankai-dispute-kg-cases-v1",
		},
	};
	await writeFile(
		join(root, "demo-bankai", "current.json"),
		JSON.stringify(current),
	);
	return root;
}

describe("LocalKnowledgeGraphArtifactRepository", () => {
	test("validates the local pointer and executes only catalogued operations", async () => {
		const root = await fixture();
		try {
			const repository = new LocalKnowledgeGraphArtifactRepository(
				root,
				"demo-bankai",
			);
			const loaded = await repository.load({ session, traceId: "trace-a" });
			expect(loaded.status).toBe("ready");
			if (loaded.status !== "ready") return;
			const rag = new KnowledgeGraphRag(
				repository,
				() => new Date("2026-01-01T00:00:00.000Z"),
			);
			const result = await rag.executeSelection({
				session,
				catalog: loaded.catalog,
				traceId: "trace-a",
				selection: {
					decision: "select",
					operationId: "kg.rules.by-feature-value",
					version: "v1",
					parameters: { item: "channel=POS", population: "transactions" },
				},
			});
			expect(result.status).toBe("ready");
			if (result.status !== "ready") return;
			expect(result.evidence[0]?.content).toContain(
				"Exploratory aggregate association",
			);
			const blocked = await rag.executeSelection({
				session,
				catalog: loaded.catalog,
				traceId: "trace-b",
				selection: {
					decision: "select",
					operationId: "kg.rules.by-feature-value",
					version: "v1",
					parameters: { item: "customer_id=LEAK", population: "transactions" },
				},
			});
			expect(blocked).toEqual({
				status: "failed",
				reasonCode: "kg_parameters_invalid",
			});
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("purges stale catalog snapshots when current.run_id changes", async () => {
		const root = await fixture();
		try {
			const repository = new LocalKnowledgeGraphArtifactRepository(
				root,
				"demo-bankai",
			);
			const first = await repository.load({ session, traceId: "trace-1" });
			expect(first.status).toBe("ready");
			expect(repository.cachedCatalogVersions()).toEqual(["kg-v1-fixture"]);

			const secondRun = "graph-fixture-2026-b";
			const firstDir = join(root, "demo-bankai", "graph-fixture-2026");
			const secondDir = join(root, "demo-bankai", secondRun);
			await mkdir(secondDir, { recursive: true });
			for (const name of [
				"graph-v1.msgpack",
				"graph-manifest.json",
				"kg-operation-catalog.json",
			]) {
				await writeFile(
					join(secondDir, name),
					await readFile(join(firstDir, name)),
				);
			}
			const catalog = JSON.parse(
				(await readFile(join(secondDir, "kg-operation-catalog.json"))).toString(
					"utf8",
				),
			) as { version: string };
			catalog.version = "kg-v1-fixture-b";
			const catalogBytes = Buffer.from(JSON.stringify(catalog));
			await writeFile(
				join(secondDir, "kg-operation-catalog.json"),
				catalogBytes,
			);
			const manifest = JSON.parse(
				(await readFile(join(secondDir, "graph-manifest.json"))).toString(
					"utf8",
				),
			) as { run_id: string; graph_sha256: string };
			manifest.run_id = secondRun;
			const manifestBytes = Buffer.from(JSON.stringify(manifest));
			await writeFile(join(secondDir, "graph-manifest.json"), manifestBytes);
			const graphBytes = await readFile(join(secondDir, "graph-v1.msgpack"));
			const current = {
				schema_version: "bankai-local-kg-publication-v1",
				tenant_id: "demo-bankai",
				run_id: secondRun,
				catalog_version: "kg-v1-fixture-b",
				artifact_dir: secondRun,
				files: {
					"graph-v1.msgpack": sha(graphBytes),
					"graph-manifest.json": sha(manifestBytes),
					"kg-operation-catalog.json": sha(catalogBytes),
				},
				provenance: {
					kdd_run_id: "kdd-fixture-2026",
					case_catalog_version: "bankai-dispute-kg-cases-v1",
				},
			};
			await writeFile(
				join(root, "demo-bankai", "current.json"),
				JSON.stringify(current),
			);

			const second = await repository.load({ session, traceId: "trace-2" });
			expect(second.status).toBe("ready");
			expect(repository.cachedCatalogVersions()).toEqual([
				"kg-v1-fixture",
				"kg-v1-fixture-b",
			]);

			const thirdRun = "graph-fixture-2026-c";
			const thirdDir = join(root, "demo-bankai", thirdRun);
			await mkdir(thirdDir, { recursive: true });
			for (const name of [
				"graph-v1.msgpack",
				"graph-manifest.json",
				"kg-operation-catalog.json",
			]) {
				await writeFile(
					join(thirdDir, name),
					await readFile(join(secondDir, name)),
				);
			}
			const catalogC = JSON.parse(
				(await readFile(join(thirdDir, "kg-operation-catalog.json"))).toString(
					"utf8",
				),
			) as { version: string };
			catalogC.version = "kg-v1-fixture-c";
			const catalogCBytes = Buffer.from(JSON.stringify(catalogC));
			await writeFile(
				join(thirdDir, "kg-operation-catalog.json"),
				catalogCBytes,
			);
			const manifestC = JSON.parse(
				(await readFile(join(thirdDir, "graph-manifest.json"))).toString(
					"utf8",
				),
			) as { run_id: string };
			manifestC.run_id = thirdRun;
			const manifestCBytes = Buffer.from(JSON.stringify(manifestC));
			await writeFile(join(thirdDir, "graph-manifest.json"), manifestCBytes);
			const graphCBytes = await readFile(join(thirdDir, "graph-v1.msgpack"));
			await writeFile(
				join(root, "demo-bankai", "current.json"),
				JSON.stringify({
					...current,
					run_id: thirdRun,
					catalog_version: "kg-v1-fixture-c",
					artifact_dir: thirdRun,
					files: {
						"graph-v1.msgpack": sha(graphCBytes),
						"graph-manifest.json": sha(manifestCBytes),
						"kg-operation-catalog.json": sha(catalogCBytes),
					},
				}),
			);
			const third = await repository.load({ session, traceId: "trace-3" });
			expect(third.status).toBe("ready");
			// Keep current + previous only; oldest snapshot purged.
			expect(repository.cachedCatalogVersions()).toEqual([
				"kg-v1-fixture-b",
				"kg-v1-fixture-c",
			]);
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("fails closed for corrupt artifacts and a foreign tenant", async () => {
		const root = await fixture(true);
		try {
			const repository = new LocalKnowledgeGraphArtifactRepository(
				root,
				"demo-bankai",
			);
			expect(await repository.load({ session, traceId: "trace-a" })).toEqual({
				status: "unavailable",
				reasonCode: "kg_catalog_unavailable",
			});
			expect(
				await repository.load({
					session: { ...session, tenantId: "foreign" },
					traceId: "trace-b",
				}),
			).toEqual({
				status: "unavailable",
				reasonCode: "kg_tenant_not_authorized",
			});
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("uses the same immutable validation contract over a GCS bucket transport", async () => {
		const root = await fixture();
		try {
			const repository = new GcsKnowledgeGraphArtifactRepository(
				{
					file(name: string) {
						return {
							download: async () => [await readFile(join(root, name))],
						};
					},
				} as never,
				"demo-bankai",
			);
			expect(
				await repository.load({ session, traceId: "trace-gcs" }),
			).toMatchObject({ status: "ready" });
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("applies the configured GCS artifact prefix and factory wiring", async () => {
		expect(normalizeArtifactPrefix("knowledge-graph")).toBe("knowledge-graph/");
		expect(normalizeArtifactPrefix("")).toBe("");
		const root = await fixture();
		try {
			const requested: string[] = [];
			const runtime = createGcsKnowledgeGraphRuntime(
				{
					GCS_ENABLED: true,
					GCS_GRAPH_BUCKET: "kg-artifacts",
					GCS_GRAPH_ARTIFACT_PREFIX: "knowledge-graph",
					GCS_GRAPH_TENANT_ID: "demo-bankai",
				},
				{
					bucket: {
						file(name: string) {
							requested.push(name);
							const relative = name.replace(/^knowledge-graph\//, "");
							return {
								download: async () => [await readFile(join(root, relative))],
							};
						},
					},
				},
			);
			expect(
				await runtime.catalog.load({ session, traceId: "trace-prefix" }),
			).toMatchObject({ status: "ready" });
			expect(requested[0]).toBe("knowledge-graph/demo-bankai/current.json");
			expect(runtime.rag).toBeInstanceOf(KnowledgeGraphRag);
			expect(() =>
				createGcsKnowledgeGraphRuntime({
					GCS_ENABLED: false,
					GCS_GRAPH_BUCKET: "kg-artifacts",
					GCS_GRAPH_ARTIFACT_PREFIX: "",
					GCS_GRAPH_TENANT_ID: "demo-bankai",
				}),
			).toThrow("kg_gcs_runtime_disabled");
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});
});
