import { describe, expect, test } from "bun:test";
import {
	type DecisionState,
	defaultAgentBudget,
} from "../src/domain/control/contracts.js";
import type { SessionContext } from "../src/domain/session.js";
import {
	InMemoryApprovalStore,
	InMemoryClarificationStore,
	InMemoryWorkflowStore,
} from "../src/integrations/memory/in-memory-control-stores.js";
import { BudgetTracker } from "../src/services/control-plane/budget-tracker.js";
import { allowRetrievalPolicy } from "../src/services/control-plane/rag-state-graph.js";
import { FactualRagRouteHandler } from "../src/services/control-plane/routes/factual-rag-route-handler.js";
import type { BaseRagCatalogRepository } from "../src/services/retrieval/rag-catalog.js";
import type { StructuredRagExecutor } from "../src/services/retrieval/structured-rag.js";
import { WorkflowService } from "../src/services/workflows/workflow-service.js";

const session: SessionContext = {
	sessionId: "s",
	userId: "u",
	tenantId: "demo-bankai",
	scopes: [],
	roles: ["customer"],
	capabilities: ["dispute.read"],
	sessionVersion: 1,
	createdAt: "2026-10-05T00:00:00.000Z",
	lastSeenAt: "2026-10-05T00:00:00.000Z",
	expiresAt: "2026-10-05T01:00:00.000Z",
	revokedAt: null,
};

const state: DecisionState = {
	intent: "customer_support",
	actorRole: "customer",
	tenantScope: "self",
	requestedTool: null,
	riskLevel: "low",
	policyFlags: [],
	accountVerified: true,
	amountBucket: null,
	evidenceQuality: "none",
	opaqueHandles: [],
	provenance: [],
};

const structuredCatalog: BaseRagCatalogRepository = {
	kind: "structured",
	load: async () => ({
		status: "ready",
		catalog: {
			kind: "structured",
			version: "v1",
			entries: [
				{ id: "customer_products", version: "v1", allowedRoles: ["customer"] },
				{
					id: "recent_transactions",
					version: "v1",
					allowedRoles: ["customer"],
					parameters: [
						{ name: "product_id", type: "string" },
						{ name: "from_date", type: "date" },
						{ name: "to_date", type: "date" },
					],
				},
			],
		},
	}),
};

const productEvidence = [
	{
		content: JSON.stringify({
			query: "customer_products:v1",
			columns: ["product_id", "product_type", "currency", "current_balance"],
			rows: [
				{
					product_id: "PRD-AAA",
					product_type: "Tarjeta Crédito",
					currency: "COP",
					current_balance: 111,
				},
				{
					product_id: "PRD-BBB",
					product_type: "Cuenta Ahorro",
					currency: "COP",
					current_balance: 222,
				},
			],
		}),
		documentRef: "customer_products:v1",
		sourceType: "bigquery_structured",
		classification: "financial" as const,
		contentHash: "h",
	},
];

function setup(options: {
	selectedParameters: Record<string, unknown>;
	listing: "ok" | "fails";
}) {
	const executed: string[] = [];
	const structuredRag: StructuredRagExecutor = {
		executeSelection: async ({ selection }) => {
			executed.push(selection.queryId);
			if (selection.queryId === "customer_products") {
				if (options.listing === "fails") throw new Error("bigquery_down");
				return { status: "ready", evidence: productEvidence };
			}
			return { status: "failed", reasonCode: "structured_parameters_missing" };
		},
	};
	const deps = {
		primaryJev: { assess: async () => "database" as const },
		structuredCatalog,
		knowledgeGraphCatalog: {
			kind: "knowledge_graph" as const,
			load: async () => ({
				status: "unavailable" as const,
				reasonCode: "x",
			}),
		},
		structuredJev: {
			select: async () => ({
				decision: "select" as const,
				queryId: "recent_transactions",
				version: "v1",
				parameters: options.selectedParameters,
			}),
		},
		knowledgeGraphJev: { select: async () => ({ decision: "deny" as const }) },
		retrievalPolicy: allowRetrievalPolicy,
		structuredRag,
		knowledgeGraphRag: {
			executeSelection: async () => ({
				status: "failed" as const,
				reasonCode: "x",
			}),
		},
	};
	const workflows = new WorkflowService(
		new InMemoryWorkflowStore(),
		new InMemoryApprovalStore(),
		{ next: () => `id-${executed.length}-${Math.random()}` },
		{ now: () => new Date("2026-10-05T00:00:00.000Z") },
		300,
		new InMemoryClarificationStore(),
	);
	const handler = new FactualRagRouteHandler("database", deps, workflows);
	const run = () =>
		handler.execute(
			{
				request: {
					sessionId: session.sessionId,
					message: "mis ultimos movimientos",
					traceId: "trace",
					threadId: "thread",
					allowedSources: [],
					budget: defaultAgentBudget,
				},
				session,
				prompt: { content: "mis ultimos movimientos", replacements: [] },
				state,
				signal: null,
				modelDecision: {
					kind: "route",
					route: "database",
					call: {
						toolId: "retrieval.read",
						version: "1",
						arguments: {},
						idempotencyKey: "k",
					},
				},
				route: {
					route: "database",
					call: {
						toolId: "retrieval.read",
						version: "1",
						arguments: {},
						idempotencyKey: "k",
					},
				},
				policy: {
					outcome: "ALLOW",
					decisionId: "d",
					policyId: "p",
					policyVersion: "1",
					riskLevel: "low",
					reasons: [],
				},
			},
			new BudgetTracker(defaultAgentBudget),
		);
	return { run, executed };
}

describe("FactualRagRouteHandler asks for what is missing", () => {
	test("names the product and period and lists the customer's products", async () => {
		const { run, executed } = setup({
			selectedParameters: {},
			listing: "ok",
		});
		const result = await run();
		expect(result.status).toBe("pending_clarification");
		if (result.status !== "pending_clarification") return;
		expect(result.question).toContain("el producto (su código) y el periodo");
		expect(result.question).toContain("• PRD-AAA (Tarjeta Crédito, COP)");
		expect(result.question).toContain("• PRD-BBB (Cuenta Ahorro, COP)");
		// Only ids, types and currencies leave the evidence; never a balance.
		expect(result.question).not.toContain("111");
		expect(executed).toEqual(["recent_transactions", "customer_products"]);
	});

	test("asks only for the period, without a second query, when the product is known", async () => {
		const { run, executed } = setup({
			selectedParameters: { product_id: "PRD-AAA" },
			listing: "ok",
		});
		const result = await run();
		expect(result.status).toBe("pending_clarification");
		if (result.status !== "pending_clarification") return;
		expect(result.question).toContain("el periodo");
		expect(result.question).not.toContain("PRD-AAA");
		expect(executed).toEqual(["recent_transactions"]);
	});

	test("still asks for the product when listing the products fails", async () => {
		const { run } = setup({ selectedParameters: {}, listing: "fails" });
		const result = await run();
		expect(result.status).toBe("pending_clarification");
		if (result.status !== "pending_clarification") return;
		expect(result.question).toContain("el producto (su código)");
		expect(result.question).not.toContain("Tus productos");
	});
});
