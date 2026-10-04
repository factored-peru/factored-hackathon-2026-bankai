import { describe, expect, test } from "bun:test";
import {
	MAX_BYTES_BILLED_CEILING,
	MAX_QUERY_ROWS,
	queryCatalogEntrySchema,
	queryCatalogSchema,
} from "../src/domain/data/query-catalog.js";

// Fixture only: the real catalog is authored separately and never lives here.
const entry = {
	queryId: "product_status",
	version: "v1",
	description: "Status and balance of one product owned by the customer.",
	sql: "SELECT product_id, product_status FROM `p.d.products` WHERE customer_id = @customer_id AND product_id = @product_id LIMIT 1",
	parameters: [
		{
			name: "customer_id",
			source: "session",
			type: "string",
			binding: "customer_id",
		},
		{
			name: "product_id",
			source: "caller",
			type: "string",
			required: true,
			maxLength: 64,
			format: "identifier",
		},
	],
	columns: [
		{ name: "product_id", type: "string", classification: "financial" },
		{ name: "product_status", type: "string", classification: "financial" },
	],
	relations: [{ column: "product_id", references: "products" }],
	allowedRoles: ["customer"],
	maxRows: 1,
	maximumBytesBilled: 50_000_000,
};

const catalog = { kind: "structured", version: "2026-01", entries: [entry] };

describe("query catalog entry", () => {
	test("accepts a complete entry and defaults relations", () => {
		expect(queryCatalogEntrySchema.safeParse(entry).success).toBe(true);
		const { relations: _relations, ...withoutRelations } = entry;
		const parsed = queryCatalogEntrySchema.parse(withoutRelations);
		expect(parsed.relations).toEqual([]);
	});

	test("rejects unknown fields so nothing free-form slips in", () => {
		expect(
			queryCatalogEntrySchema.safeParse({ ...entry, table: "other" }).success,
		).toBe(false);
	});

	test("rejects a session parameter bound to an unknown value", () => {
		const parameters = [
			{ name: "x", source: "session", type: "string", binding: "email" },
		];
		expect(
			queryCatalogEntrySchema.safeParse({ ...entry, parameters }).success,
		).toBe(false);
	});

	test("rejects a caller parameter that has no type constraints", () => {
		const parameters = [
			{ name: "free", source: "caller", type: "string", required: true },
		];
		expect(
			queryCatalogEntrySchema.safeParse({ ...entry, parameters }).success,
		).toBe(false);
	});

	test("rejects duplicate parameter and column names", () => {
		const [first, second] = entry.parameters;
		expect(
			queryCatalogEntrySchema.safeParse({
				...entry,
				parameters: [first, first, second],
			}).success,
		).toBe(false);
		const [column] = entry.columns;
		expect(
			queryCatalogEntrySchema.safeParse({
				...entry,
				columns: [column, column],
			}).success,
		).toBe(false);
	});

	test("rejects a relation to a column the query does not return", () => {
		expect(
			queryCatalogEntrySchema.safeParse({
				...entry,
				relations: [{ column: "customer_id", references: "customers" }],
			}).success,
		).toBe(false);
	});

	test("enforces the row and billed-bytes ceilings", () => {
		expect(
			queryCatalogEntrySchema.safeParse({
				...entry,
				maxRows: MAX_QUERY_ROWS + 1,
			}).success,
		).toBe(false);
		expect(
			queryCatalogEntrySchema.safeParse({
				...entry,
				maximumBytesBilled: MAX_BYTES_BILLED_CEILING + 1,
			}).success,
		).toBe(false);
	});

	test("requires at least one allowed role and one column", () => {
		expect(
			queryCatalogEntrySchema.safeParse({ ...entry, allowedRoles: [] }).success,
		).toBe(false);
		expect(
			queryCatalogEntrySchema.safeParse({ ...entry, columns: [] }).success,
		).toBe(false);
	});
});

describe("query catalog", () => {
	test("accepts a versioned structured catalog", () => {
		expect(queryCatalogSchema.safeParse(catalog).success).toBe(true);
	});

	test("rejects an empty catalog or another kind", () => {
		expect(
			queryCatalogSchema.safeParse({ ...catalog, entries: [] }).success,
		).toBe(false);
		expect(
			queryCatalogSchema.safeParse({ ...catalog, kind: "knowledge_graph" })
				.success,
		).toBe(false);
	});

	test("rejects the same queryId and version twice", () => {
		expect(
			queryCatalogSchema.safeParse({ ...catalog, entries: [entry, entry] })
				.success,
		).toBe(false);
		expect(
			queryCatalogSchema.safeParse({
				...catalog,
				entries: [entry, { ...entry, version: "v2" }],
			}).success,
		).toBe(true);
	});
});
