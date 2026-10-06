import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import type { RagCatalog } from "../retrieval/rag-catalog.js";
import type { StructuredSelectDecision } from "../retrieval/structured-rag.js";

/** Catalog entry that lists the customer's products; it takes no caller input. */
export const productListQueryId = "customer_products";

const maxProductsListed = 8;

export type ListedProduct = Readonly<{
	productId: string;
	type: string;
	currency: string;
}>;

/**
 * Caller parameters the chosen entry declares but the selector did not fill.
 * The catalog view does not say which are required, so an optional one can be
 * named too; asking for it is harmless, guessing a value would not be.
 */
export function missingCallerParameters(input: {
	catalog: RagCatalog | null;
	selection: StructuredSelectDecision | null;
}): string[] {
	if (input.catalog === null || input.selection === null) return [];
	const { queryId, version, parameters } = input.selection;
	const entry = input.catalog.entries.find(
		(candidate) => candidate.id === queryId && candidate.version === version,
	);
	return (entry?.parameters ?? [])
		.map((parameter) => parameter.name)
		.filter((name) => {
			const value = parameters[name];
			return value === undefined || value === null || value === "";
		});
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Reads product rows out of the evidence of `customer_products`. */
export function productsFromEvidence(
	evidence: readonly ModelEvidence[],
): ListedProduct[] {
	const products: ListedProduct[] = [];
	for (const item of evidence) {
		let body: unknown;
		try {
			body = JSON.parse(item.content);
		} catch {
			continue;
		}
		if (!isRecord(body) || !Array.isArray(body.rows)) continue;
		for (const row of body.rows) {
			if (!isRecord(row) || typeof row.product_id !== "string") continue;
			products.push({
				productId: row.product_id,
				type: typeof row.product_type === "string" ? row.product_type : "",
				currency: typeof row.currency === "string" ? row.currency : "",
			});
		}
	}
	return products;
}

function describeProduct(product: ListedProduct): string {
	const detail = [product.type, product.currency]
		.filter((part) => part.length > 0)
		.join(", ");
	return detail.length > 0
		? `${product.productId} (${detail})`
		: product.productId;
}

/**
 * Names what is missing instead of a generic prompt, and lists the customer's
 * own products when the product is missing so they can answer with a code.
 * Returns null when the missing parameters are not ones it knows how to ask for.
 */
export function buildMissingParametersQuestion(input: {
	missing: readonly string[];
	products: readonly ListedProduct[];
}): string | null {
	const asks: string[] = [];
	const needsProduct = input.missing.includes("product_id");
	const needsPeriod =
		input.missing.includes("from_date") || input.missing.includes("to_date");
	if (needsProduct) asks.push("el producto (su código)");
	if (needsPeriod) asks.push("el periodo (fecha desde y fecha hasta)");
	if (asks.length === 0) return null;

	let question = `Para consultarlo necesito ${asks.join(" y ")}.`;
	if (needsProduct && input.products.length > 0) {
		const listed = input.products
			.slice(0, maxProductsListed)
			.map((product) => `• ${describeProduct(product)}`)
			.join("\n");
		question += `\nTus productos:\n${listed}`;
	}
	return question;
}
