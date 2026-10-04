import { describe, expect, test } from "bun:test";
import { evidenceDtoSchema } from "../src/domain/retrieval/evidence.js";

const evidence = {
	source: {
		kind: "structured",
		queryId: "product_status",
		queryVersion: "v1",
		catalogVersion: "2026-01",
		jobId: "job-1",
	},
	scope: "self",
	filters: { product_id: "p-1" },
	columns: [
		{ name: "product_id", type: "string", classification: "financial" },
		{ name: "current_balance", type: "float64", classification: "financial" },
	],
	rows: [{ product_id: "p-1", current_balance: 10.5 }],
	relations: [{ column: "product_id", references: "products" }],
	metrics: {
		rowCount: 1,
		truncated: false,
		bytesProcessed: 1024,
		durationMs: 12,
	},
	retrievedAt: "2026-01-01T00:00:00.000Z",
};

describe("EvidenceDTO", () => {
	test("accepts sanitized evidence", () => {
		expect(evidenceDtoSchema.safeParse(evidence).success).toBe(true);
	});

	test("rejects fields that would leak storage or identity details", () => {
		for (const extra of [{ sql: "SELECT 1" }, { customerId: "c-1" }]) {
			expect(
				evidenceDtoSchema.safeParse({ ...evidence, ...extra }).success,
			).toBe(false);
		}
		expect(
			evidenceDtoSchema.safeParse({
				...evidence,
				source: { ...evidence.source, table: "p.d.products" },
			}).success,
		).toBe(false);
	});

	test("rejects a rowCount that disagrees with the rows", () => {
		expect(
			evidenceDtoSchema.safeParse({
				...evidence,
				metrics: { ...evidence.metrics, rowCount: 2 },
			}).success,
		).toBe(false);
	});

	test("rejects a row with a column that was not declared", () => {
		expect(
			evidenceDtoSchema.safeParse({
				...evidence,
				rows: [{ product_id: "p-1", email: "x@example.com" }],
			}).success,
		).toBe(false);
	});

	test("allows null cells because BigQuery columns are nullable", () => {
		expect(
			evidenceDtoSchema.safeParse({
				...evidence,
				rows: [{ product_id: "p-1", current_balance: null }],
			}).success,
		).toBe(true);
	});
});
