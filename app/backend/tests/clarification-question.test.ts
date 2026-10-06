import { describe, expect, test } from "bun:test";
import {
	buildMissingParametersQuestion,
	missingCallerParameters,
	productsFromEvidence,
} from "../src/services/control-plane/clarification-question.js";
import type { RagCatalog } from "../src/services/retrieval/rag-catalog.js";
import type { StructuredSelectDecision } from "../src/services/retrieval/structured-rag.js";

const catalog: RagCatalog = {
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
};

const select = (parameters: Record<string, unknown>) =>
	({
		decision: "select",
		queryId: "recent_transactions",
		version: "v1",
		parameters,
	}) as StructuredSelectDecision;

describe("missingCallerParameters", () => {
	test("lists the declared parameters the selector left out", () => {
		expect(missingCallerParameters({ catalog, selection: select({}) })).toEqual(
			["product_id", "from_date", "to_date"],
		);
		expect(
			missingCallerParameters({
				catalog,
				selection: select({ product_id: "PRD-1" }),
			}),
		).toEqual(["from_date", "to_date"]);
	});

	test("treats null and empty values as missing", () => {
		expect(
			missingCallerParameters({
				catalog,
				selection: select({
					product_id: "PRD-1",
					from_date: null,
					to_date: "",
				}),
			}),
		).toEqual(["from_date", "to_date"]);
	});

	test("is empty without a catalog, a selection or parameters to fill", () => {
		expect(missingCallerParameters({ catalog: null, selection: null })).toEqual(
			[],
		);
		expect(
			missingCallerParameters({
				catalog,
				selection: {
					decision: "select",
					queryId: "customer_products",
					version: "v1",
					parameters: {},
				} as StructuredSelectDecision,
			}),
		).toEqual([]);
	});
});

describe("productsFromEvidence", () => {
	const evidence = [
		{
			content: JSON.stringify({
				rows: [
					{
						product_id: "PRD-1",
						product_type: "Tarjeta Crédito",
						currency: "COP",
						current_balance: 5,
					},
					{
						product_id: "PRD-2",
						product_type: "Cuenta Ahorro",
						currency: "COP",
					},
					{ product_type: "sin id" },
				],
			}),
			documentRef: "customer_products:v1",
			sourceType: "bigquery_structured",
			classification: "financial" as const,
			contentHash: "h",
		},
	];

	test("keeps only id, type and currency, never balances", () => {
		const products = productsFromEvidence(evidence);
		expect(products).toEqual([
			{ productId: "PRD-1", type: "Tarjeta Crédito", currency: "COP" },
			{ productId: "PRD-2", type: "Cuenta Ahorro", currency: "COP" },
		]);
		expect(JSON.stringify(products)).not.toContain("current_balance");
	});

	test("ignores evidence that is not a product table", () => {
		expect(
			productsFromEvidence([{ ...evidence[0], content: "no json" } as never]),
		).toEqual([]);
	});
});

describe("buildMissingParametersQuestion", () => {
	const products = [
		{ productId: "PRD-1", type: "Tarjeta Crédito", currency: "COP" },
	];

	test("asks for the product and lists the customer's products", () => {
		const question = buildMissingParametersQuestion({
			missing: ["product_id", "from_date", "to_date"],
			products,
		});
		expect(question).toContain("el producto (su código) y el periodo");
		expect(question).toContain("• PRD-1 (Tarjeta Crédito, COP)");
	});

	test("asks only for the period when the product is known", () => {
		const question = buildMissingParametersQuestion({
			missing: ["from_date"],
			products,
		});
		expect(question).toContain("el periodo");
		expect(question).not.toContain("producto");
		expect(question).not.toContain("PRD-1");
	});

	test("still asks for the product when the list is unavailable", () => {
		const question = buildMissingParametersQuestion({
			missing: ["product_id"],
			products: [],
		});
		expect(question).toBe("Para consultarlo necesito el producto (su código).");
	});

	test("returns null for parameters it does not know how to ask for", () => {
		expect(
			buildMissingParametersQuestion({ missing: ["other"], products }),
		).toBeNull();
	});
});
