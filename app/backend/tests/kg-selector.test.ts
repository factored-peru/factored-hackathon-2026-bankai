import { describe, expect, test } from "bun:test";
import { createKnowledgeGraphSelector } from "../src/integrations/providers/knowledge-graph-selector-runtime.js";
import { TypeSafeKgOperationChooser } from "../src/integrations/providers/typesafe-kg-operation-chooser.js";
import { ComposedKnowledgeGraphSelector } from "../src/services/retrieval/knowledge-graph-composed-selection.js";
import type { RagCatalogEntry } from "../src/services/retrieval/rag-catalog.js";
import type { StructuredParameterInterpreter } from "../src/services/retrieval/structured-selection.js";

const entries: RagCatalogEntry[] = [
	{
		id: "kg.case.summary",
		version: "v1",
		allowedRoles: ["customer"],
		description: "Aggregate analytical dispute case with restrictions.",
		parameters: [
			{
				name: "case_id",
				type: "string",
				allowedValues: ["C1", "C2", "C3", "C4", "C5"],
			},
		],
	},
	{
		id: "kg.population.summary",
		version: "v1",
		allowedRoles: ["customer"],
		description: "Aggregate population statistics.",
		parameters: [
			{ name: "population", type: "string", allowedValues: ["transactions"] },
		],
	},
];

function jevResponse(answer: Record<string, unknown>, status = 200) {
	return new Response(JSON.stringify({ answers: { operation: answer } }), {
		status,
		headers: { "Content-Type": "application/json" },
	});
}

describe("TypeSafeKgOperationChooser", () => {
	test("asks one English choice question over KG operations", async () => {
		let body: unknown;
		const chooser = new TypeSafeKgOperationChooser({
			baseUrl: "https://jev.example.test",
			apiKey: "secret",
			model: "jev-latest",
			minConfidence: 0.7,
			timeoutMs: 1000,
			fetch: (async (_url: string, init?: RequestInit) => {
				body = JSON.parse(String(init?.body ?? "{}"));
				return jevResponse({
					choice: "kg.case.summary_v1",
					confidence: 0.91,
				});
			}) as unknown as typeof fetch,
		});
		const choice = await chooser.choose({
			query: "qué reclamos estallan el SLA",
			entries,
			traceId: "t",
		});
		expect(choice).toEqual({
			decision: "choose",
			id: "kg.case.summary",
			version: "v1",
		});
		const text = JSON.stringify(body);
		expect(text).toContain(
			"Choose the single knowledge-graph catalog operation",
		);
		expect(text).not.toMatch(/elige|operación del catálogo/i);
	});
});

describe("ComposedKnowledgeGraphSelector", () => {
	test("chooses then interprets parameters into a KG selection", async () => {
		const interpreter: StructuredParameterInterpreter = {
			interpret: async () => ({ case_id: "C1" }),
		};
		const selector = new ComposedKnowledgeGraphSelector(
			{
				choose: async () => ({
					decision: "choose",
					id: "kg.case.summary",
					version: "v1",
				}),
			},
			interpreter,
		);
		const result = await selector.select({
			query: "C1 SLA",
			catalog: { kind: "knowledge_graph", version: "v1", entries },
			traceId: "t",
		});
		expect(result).toEqual({
			decision: "select",
			operationId: "kg.case.summary",
			version: "v1",
			parameters: { case_id: "C1" },
		});
	});
});

describe("createKnowledgeGraphSelector", () => {
	test("fails closed when providers are disabled", async () => {
		await expect(
			createKnowledgeGraphSelector({
				JEV_ENABLED: false,
				JEV_BASE_URL: "",
				JEV_API_KEY: "",
				JEV_MODEL: "",
				JEV_MIN_CONFIDENCE: 0.7,
				JEV_TIMEOUT_MS: 1000,
				VERTEX_AI_ENABLED: true,
				VERTEX_AI_PROJECT_ID: "p",
				VERTEX_AI_LOCATION: "us-central1",
				VERTEX_AI_MODEL: "m",
			}),
		).rejects.toThrow("knowledge_graph_selector_jev_disabled");
	});
});
