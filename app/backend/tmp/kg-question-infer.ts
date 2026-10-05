/**
 * Operator script: map a natural-language question to closed KG-RAG operations
 * and retrieve graph evidence. Not part of the permanent test suite.
 *
 * Example:
 *   bun tmp/kg-question-infer.ts \
 *     "¿Qué reglas del grafo explican transaction_status=DECLINED?"
 */
import { resolve } from "node:path";
import type { SessionContext } from "../src/domain/session.js";
import { LocalKnowledgeGraphArtifactRepository } from "../src/integrations/kg/local-knowledge-graph-runtime.js";
import { KnowledgeGraphRag } from "../src/services/retrieval/knowledge-graph-rag.js";

const question =
	process.argv.slice(2).join(" ").trim() ||
	"¿Qué condiciones del grafo elevan la probabilidad de que una transacción quede DECLINED, y qué casos de disputa aplican?";

const session: SessionContext = {
	sessionId: "kg-question-infer",
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

type PlannedOp = {
	label: string;
	rationale: string;
	selection: {
		decision: "select";
		operationId: string;
		version: "v1";
		parameters: Record<string, string>;
	};
};

function planQuestion(text: string): PlannedOp[] {
	const lower = text.toLowerCase();
	const ops: PlannedOp[] = [];
	const wantsDeclined =
		lower.includes("declined") ||
		lower.includes("rechaz") ||
		lower.includes("denegad");
	const wantsFraud = lower.includes("fraud") || lower.includes("fraude");
	const wantsComplaint =
		lower.includes("disputa") ||
		lower.includes("reclamo") ||
		lower.includes("complaint") ||
		lower.includes("in_process") ||
		lower.includes("en proceso");
	const wantsCase = lower.includes("caso") || lower.includes("c1") || lower.includes("aplica");

	ops.push({
		label: "population_transactions",
		rationale: "Anclar la pregunta al perfil agregado de transactions en el grafo.",
		selection: {
			decision: "select",
			operationId: "kg.population.summary",
			version: "v1",
			parameters: { population: "transactions" },
		},
	});

	if (wantsDeclined || wantsFraud || (!wantsComplaint && !wantsCase)) {
		ops.push({
			label: "rules_declined",
			rationale:
				"La pregunta pide condiciones asociadas a transaction_status=DECLINED; requiere kg.rules.by-target.",
			selection: {
				decision: "select",
				operationId: "kg.rules.by-target",
				version: "v1",
				parameters: {
					population: "transactions",
					target: "transaction_status=DECLINED",
				},
			},
		});
	}

	if (wantsFraud) {
		ops.push({
			label: "rules_feature_is_fraud_true",
			rationale: "Cruce por feature is_fraud=TRUE vía kg.rules.by-feature-value.",
			selection: {
				decision: "select",
				operationId: "kg.rules.by-feature-value",
				version: "v1",
				parameters: { population: "transactions", item: "is_fraud=TRUE" },
			},
		});
	}

	if (wantsComplaint) {
		ops.push({
			label: "population_complaints",
			rationale: "Scope Dispute Transaction Support sobre complaints.",
			selection: {
				decision: "select",
				operationId: "kg.population.summary",
				version: "v1",
				parameters: { population: "complaints" },
			},
		});
		ops.push({
			label: "rules_in_process",
			rationale: "Reglas corroboradas hacia status=IN_PROCESS (intake, sin leakage).",
			selection: {
				decision: "select",
				operationId: "kg.rules.by-target",
				version: "v1",
				parameters: {
					population: "complaints",
					target: "status=IN_PROCESS",
				},
			},
		});
	}

	if (wantsCase || wantsDeclined) {
		ops.push({
			label: "case_C1",
			rationale: "C1 es el caso de disputa/transacción expuesto en el catálogo KG.",
			selection: {
				decision: "select",
				operationId: "kg.case.summary",
				version: "v1",
				parameters: { case_id: "C1" },
			},
		});
	}

	return ops;
}

const root = resolve(import.meta.dir, "../.local/kg-rag");
const repository = new LocalKnowledgeGraphArtifactRepository(root, "demo-bankai");
const rag = new KnowledgeGraphRag(repository, () => new Date("2026-10-04T21:00:00.000Z"));

const loaded = await repository.load({ session, traceId: "question-load" });
if (loaded.status !== "ready") {
	console.error(JSON.stringify({ question, loaded }, null, 2));
	process.exit(1);
}

const plan = planQuestion(question);
const evidence: Array<Record<string, unknown>> = [];

for (const step of plan) {
	const result = await rag.executeSelection({
		session,
		catalog: loaded.catalog,
		selection: step.selection,
		traceId: `question-${step.label}`,
	});
	let rows: unknown[] = [];
	if (result.status === "ready") {
		const parsed = JSON.parse(result.evidence[0]?.content ?? "{}") as {
			rows?: unknown[];
		};
		rows = parsed.rows ?? [];
	}
	const ranked = [...rows].sort((left, right) => {
		const liftL = Number((left as { lift?: number }).lift ?? 0);
		const liftR = Number((right as { lift?: number }).lift ?? 0);
		return liftR - liftL;
	});
	evidence.push({
		label: step.label,
		rationale: step.rationale,
		operationId: step.selection.operationId,
		parameters: step.selection.parameters,
		status: result.status,
		reasonCode: result.status === "failed" ? result.reasonCode : undefined,
		rowCount: ranked.length,
		topRows: ranked.slice(0, 5),
	});
}

const declined = evidence.find((item) => item.label === "rules_declined");
const topDeclined = (declined?.topRows as Array<Record<string, unknown>> | undefined) ?? [];

console.log(
	JSON.stringify(
		{
			question,
			artifactRoot: root,
			catalogVersion: loaded.catalog.version,
			requiresGraph: true,
			plan: plan.map((step) => ({
				label: step.label,
				operationId: step.selection.operationId,
				rationale: step.rationale,
			})),
			evidence,
			analysis: {
				summary:
					topDeclined.length > 0
						? `El grafo devolvió ${declined?.rowCount ?? 0} reglas corroboradas hacia transaction_status=DECLINED; top lift=${topDeclined[0]?.lift}.`
						: "La pregunta no activó reglas DECLINED o el grafo no tiene filas para ese target.",
				interpretation:
					"Las reglas son asociaciones agregadas de KDD (consenso Apriori∩FP-Growth∩Eclat), no causalidad ni decisión sobre un cliente.",
				top_declined_rules: topDeclined.slice(0, 3),
			},
		},
		null,
		2,
	),
);
