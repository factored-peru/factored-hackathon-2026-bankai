/**
 * Operator scorecard: probe every Ci against the published local KG artifact.
 * Volatile — not part of the permanent test suite.
 *
 * bun tmp/kg-ci-scorecard.ts
 */
import { resolve } from "node:path";
import type { SessionContext } from "../src/domain/session.js";
import { LocalKnowledgeGraphArtifactRepository } from "../src/integrations/kg/local-knowledge-graph-runtime.js";
import { KnowledgeGraphRag } from "../src/services/retrieval/knowledge-graph-rag.js";

const session: SessionContext = {
	sessionId: "kg-ci-scorecard",
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

type Op = {
	label: string;
	selection: {
		decision: "select";
		operationId: string;
		version: "v1";
		parameters: Record<string, string>;
	};
};

function auxiliaryOps(caseId: string): Op[] {
	if (caseId === "C1" || caseId === "C2") {
		return [
			{
				label: "population_complaints",
				selection: {
					decision: "select",
					operationId: "kg.population.summary",
					version: "v1",
					parameters: { population: "complaints" },
				},
			},
			{
				label: "rules_in_process",
				selection: {
					decision: "select",
					operationId: "kg.rules.by-target",
					version: "v1",
					parameters: {
						population: "complaints",
						target: "status=IN_PROCESS",
					},
				},
			},
		];
	}
	if (caseId === "C3") {
		return [
			{
				label: "population_transactions",
				selection: {
					decision: "select",
					operationId: "kg.population.summary",
					version: "v1",
					parameters: { population: "transactions" },
				},
			},
			{
				label: "rules_declined",
				selection: {
					decision: "select",
					operationId: "kg.rules.by-target",
					version: "v1",
					parameters: {
						population: "transactions",
						target: "transaction_status=DECLINED",
					},
				},
			},
			{
				label: "rules_is_fraud_true",
				selection: {
					decision: "select",
					operationId: "kg.rules.by-feature-value",
					version: "v1",
					parameters: { population: "transactions", item: "is_fraud=TRUE" },
				},
			},
		];
	}
	return [];
}

const root = resolve(import.meta.dir, "../.local/kg-rag");
const repository = new LocalKnowledgeGraphArtifactRepository(root, "demo-bankai");
const rag = new KnowledgeGraphRag(repository, () => new Date("2026-10-04T21:00:00.000Z"));

const loaded = await repository.load({ session, traceId: "ci-scorecard-load" });
if (loaded.status !== "ready") {
	console.error(JSON.stringify(loaded, null, 2));
	process.exit(1);
}

const cases = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8"];
const report: Array<Record<string, unknown>> = [];

for (const caseId of cases) {
	const ops: Op[] = [
		{
			label: "case_summary",
			selection: {
				decision: "select",
				operationId: "kg.case.summary",
				version: "v1",
				parameters: { case_id: caseId },
			},
		},
		...auxiliaryOps(caseId),
	];
	const evidence: Array<Record<string, unknown>> = [];
	for (const op of ops) {
		const result = await rag.executeSelection({
			session,
			catalog: loaded.catalog,
			selection: op.selection,
			traceId: `ci-${caseId}-${op.label}`,
		});
		let rows: unknown[] = [];
		if (result.status === "ready") {
			const parsed = JSON.parse(result.evidence[0]?.content ?? "{}") as {
				rows?: unknown[];
			};
			rows = parsed.rows ?? [];
		}
		evidence.push({
			label: op.label,
			operationId: op.selection.operationId,
			parameters: op.selection.parameters,
			status: result.status,
			reasonCode: result.status === "failed" ? result.reasonCode : undefined,
			rowCount: rows.length,
			sampleRows: rows.slice(0, 3),
		});
	}
	const summary = evidence.find((item) => item.label === "case_summary");
	const caseRow = ((summary?.sampleRows as unknown[]) ?? [])[0] as
		| Record<string, unknown>
		| undefined;
	report.push({
		case_id: caseId,
		status: caseRow?.status ?? null,
		target: caseRow?.target ?? null,
		limitation: caseRow?.limitation ?? null,
		model_runs: caseRow?.model_runs ?? "",
		evidence,
	});
}

console.log(
	JSON.stringify(
		{
			artifactRoot: root,
			catalogVersion: loaded.catalog.version,
			cases: report,
		},
		null,
		2,
	),
);
