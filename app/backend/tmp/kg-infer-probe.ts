/**
 * One-off local KG inference probe against the published demo-bankai artifact.
 * Volatile operator script — not part of the permanent test suite.
 */
import { resolve } from "node:path";
import type { SessionContext } from "../src/domain/session.js";
import { LocalKnowledgeGraphArtifactRepository } from "../src/integrations/kg/local-knowledge-graph-runtime.js";
import { KnowledgeGraphRag } from "../src/services/retrieval/knowledge-graph-rag.js";

const session: SessionContext = {
	sessionId: "kg-infer-probe",
	userId: "operator",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer", "backoffice"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-10-04T00:00:00.000Z",
	lastSeenAt: "2026-10-04T00:00:00.000Z",
	expiresAt: "2026-10-05T00:00:00.000Z",
	revokedAt: null,
};

const root = resolve(import.meta.dir, "../.local/kg-rag");
const repository = new LocalKnowledgeGraphArtifactRepository(root, "demo-bankai");
const rag = new KnowledgeGraphRag(repository, () => new Date("2026-10-04T21:00:00.000Z"));

const loaded = await repository.load({ session, traceId: "infer-load" });
if (loaded.status !== "ready") {
	console.error(JSON.stringify(loaded, null, 2));
	process.exit(1);
}

const selections = [
	{
		label: "case_C1",
		selection: {
			decision: "select" as const,
			operationId: "kg.case.summary",
			version: "v1",
			parameters: { case_id: "C1" },
		},
	},
	{
		label: "case_C6_blocked",
		selection: {
			decision: "select" as const,
			operationId: "kg.case.summary",
			version: "v1",
			parameters: { case_id: "C6" },
		},
	},
	{
		label: "population_transactions",
		selection: {
			decision: "select" as const,
			operationId: "kg.population.summary",
			version: "v1",
			parameters: { population: "transactions" },
		},
	},
	{
		label: "population_complaints",
		selection: {
			decision: "select" as const,
			operationId: "kg.population.summary",
			version: "v1",
			parameters: { population: "complaints" },
		},
	},
	{
		label: "rules_target_declined",
		selection: {
			decision: "select" as const,
			operationId: "kg.rules.by-target",
			version: "v1",
			parameters: {
				population: "transactions",
				target: "transaction_status=DECLINED",
			},
		},
	},
	{
		label: "rules_target_in_process",
		selection: {
			decision: "select" as const,
			operationId: "kg.rules.by-target",
			version: "v1",
			parameters: {
				population: "complaints",
				target: "status=IN_PROCESS",
			},
		},
	},
	{
		label: "rules_target_resolved_expect_empty",
		selection: {
			decision: "select" as const,
			operationId: "kg.rules.by-target",
			version: "v1",
			parameters: {
				population: "complaints",
				target: "status=RESOLVED",
			},
		},
	},
];

// Discover a concrete feature value from the catalog for by-feature-value.
const rulesByFeature = loaded.catalog.entries.find(
	(entry) => entry.id === "kg.rules.by-feature-value",
);
const itemParam = rulesByFeature?.parameters?.find((parameter) => parameter.name === "item");
const sampleItems = (itemParam?.allowedValues ?? [])
	.filter((value) => value.startsWith("channel=") || value.startsWith("priority=") || value.startsWith("is_fraud="))
	.slice(0, 3);

for (const item of sampleItems) {
	const population = item.startsWith("priority=") ? "complaints" : "transactions";
	selections.push({
		label: `rules_item_${item}`,
		selection: {
			decision: "select" as const,
			operationId: "kg.rules.by-feature-value",
			version: "v1",
			parameters: { population, item },
		},
	});
}

const report: Array<Record<string, unknown>> = [];
for (const probe of selections) {
	const result = await rag.executeSelection({
		session,
		catalog: loaded.catalog,
		selection: probe.selection,
		traceId: `infer-${probe.label}`,
	});
	let preview: unknown = null;
	if (result.status === "ready") {
		const parsed = JSON.parse(result.evidence[0]?.content ?? "{}") as {
			rows?: unknown[];
		};
		preview = {
			rowCount: parsed.rows?.length ?? 0,
			sampleRows: (parsed.rows ?? []).slice(0, 3),
		};
	}
	report.push({
		label: probe.label,
		selection: probe.selection,
		status: result.status,
		reasonCode: result.status === "failed" ? result.reasonCode : undefined,
		preview,
	});
}

console.log(
	JSON.stringify(
		{
			artifactRoot: root,
			catalogVersion: loaded.catalog.version,
			operationCount: loaded.catalog.entries.length,
			probes: report,
		},
		null,
		2,
	),
);
