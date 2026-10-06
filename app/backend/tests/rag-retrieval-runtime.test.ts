import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { encode } from "@msgpack/msgpack";
import type { SessionContext } from "../src/domain/session.js";
import { LocalKnowledgeGraphArtifactRepository } from "../src/integrations/kg/local-knowledge-graph-runtime.js";
import {
	createRagRetrievalRuntime,
	denyKnowledgeGraphSelector,
} from "../src/services/control-plane/rag-retrieval-runtime.js";
import { ragThreadConfig } from "../src/services/control-plane/rag-state-graph.js";
import { KnowledgeGraphRag } from "../src/services/retrieval/knowledge-graph-rag.js";

const session: SessionContext = {
	sessionId: "session-kg",
	userId: "user-kg",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: ["dispute.read"],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

async function fixtureRoot(): Promise<string> {
	const root = await mkdtemp(join(tmpdir(), "kg-rag-runtime-"));
	const runId = "graph-runtime-20261004";
	const versionDir = join(root, "demo-bankai", runId);
	await mkdir(versionDir, { recursive: true });
	const graph = {
		format: "bankai-kdd-graph",
		schema_version: "bankai-kdd-graph-v1",
		source: {
			kdd_run_id: "kdd-runtime-20261004",
			case_catalog_version: "bankai-dispute-kg-cases-v1",
		},
		nodes: [
			{
				id: "population:transactions",
				kind: "population",
				attributes: { name: "transactions", target: "transaction_status" },
			},
			{
				id: "target:transactions:transaction_status=DECLINED",
				kind: "target",
				attributes: { feature: "transaction_status", value: "DECLINED" },
			},
			{
				id: "value:transactions:channel=POS",
				kind: "feature_value",
				attributes: { feature: "channel", value: "POS" },
			},
			{
				id: "rule:transactions:fixture",
				kind: "rule",
				attributes: { population: "transactions" },
			},
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
				target: "rule:transactions:fixture",
				relation: "antecedent",
				attributes: {},
			},
			{
				source: "rule:transactions:fixture",
				target: "target:transactions:transaction_status=DECLINED",
				relation: "predicts",
				attributes: {
					algorithms: ["apriori", "fpgrowth", "eclat"],
					support: 0.4,
					confidence: 0.8,
					lift: 1.6,
				},
			},
		],
	};
	const graphBytes = encode(graph);
	const graphSha = sha256(graphBytes);
	const manifest = {
		schema_version: "bankai-kdd-graph-v1",
		run_id: runId,
		graph_file: "graph-v1.msgpack",
		graph_sha256: graphSha,
		source: graph.source,
	};
	const manifestBytes = Buffer.from(
		`${JSON.stringify(manifest, null, 2)}\n`,
		"utf8",
	);
	const catalog = {
		schema_version: "bankai-kg-operation-catalog-v1",
		kind: "knowledge_graph",
		version: `kg-v1-${graphSha.slice(0, 16)}`,
		graph_schema_version: "bankai-kdd-graph-v1",
		operations: [
			{
				id: "kg.population.summary",
				version: "v1",
				description: "Aggregate population",
				allowedRoles: ["customer", "backoffice"],
				parameters: [
					{
						name: "population",
						type: "string",
						allowedValues: ["transactions"],
					},
				],
			},
		],
	};
	const catalogBytes = Buffer.from(
		`${JSON.stringify(catalog, null, 2)}\n`,
		"utf8",
	);
	await writeFile(join(versionDir, "graph-v1.msgpack"), graphBytes);
	await writeFile(join(versionDir, "graph-manifest.json"), manifestBytes);
	await writeFile(join(versionDir, "kg-operation-catalog.json"), catalogBytes);
	const pointer = {
		schema_version: "bankai-local-kg-publication-v1",
		tenant_id: "demo-bankai",
		run_id: runId,
		catalog_version: catalog.version,
		artifact_dir: runId,
		files: {
			"graph-v1.msgpack": graphSha,
			"graph-manifest.json": sha256(manifestBytes),
			"kg-operation-catalog.json": sha256(catalogBytes),
		},
		provenance: {
			kdd_run_id: "kdd-runtime-20261004",
			case_catalog_version: "bankai-dispute-kg-cases-v1",
		},
	};
	await writeFile(
		join(root, "demo-bankai", "current.json"),
		`${JSON.stringify(pointer, null, 2)}\n`,
	);
	return root;
}

describe("createRagRetrievalRuntime", () => {
	test("loads the published KG catalog through the retrieval StateGraph", async () => {
		const root = await fixtureRoot();
		try {
			const catalog = new LocalKnowledgeGraphArtifactRepository(
				root,
				"demo-bankai",
			);
			const knowledgeGraph = {
				catalog,
				rag: new KnowledgeGraphRag(catalog),
			};
			const { graph } = createRagRetrievalRuntime({
				knowledgeGraph,
				knowledgeGraphJev: {
					select: async () => ({
						decision: "select",
						operationId: "kg.population.summary",
						version: "v1",
						parameters: { population: "transactions" },
					}),
				},
			});
			const result = await graph.invoke(
				{
					query: "resumen de transacciones",
					session,
					traceId: "trace-kg-runtime",
					route: "relations",
					catalog: null,
					terminalReason: null,
					knowledgeGraphSelection: null,
					history: [],
					executionOrder: [],
				},
				ragThreadConfig(session, "thread-kg"),
			);
			expect(result.executionOrder).toContain("kg_catalog");
			expect(result.executionOrder).toContain("retrieval_policy");
			expect(result.executionOrder).toContain("kg_rag");
			expect(result.terminalReason).toBeNull();
		} finally {
			await rm(root, { recursive: true, force: true });
		}
	});

	test("default KG JEV denies until a production selector is injected", async () => {
		expect(
			await denyKnowledgeGraphSelector.select({
				query: "x",
				catalog: { kind: "knowledge_graph", version: "v1", entries: [] },
				traceId: "t",
			}),
		).toEqual({ decision: "deny" });
	});
});
