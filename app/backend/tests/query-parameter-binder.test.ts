import { describe, expect, test } from "bun:test";
import type { QueryCatalogEntry } from "../src/domain/data/query-catalog.js";
import { bindQueryParameters } from "../src/services/data/query-parameter-binder.js";

// The binder does not read SQL, so the template here is irrelevant.
const entry: QueryCatalogEntry = {
	queryId: "recent_transactions",
	version: "v1",
	description: "Transactions of one product in a date range.",
	sql: "unused",
	parameters: [
		{
			name: "customer_id",
			source: "session",
			type: "string",
			binding: "customer_id",
		},
		{
			name: "tenant",
			source: "session",
			type: "string",
			binding: "tenant_id",
		},
		{
			name: "product_id",
			source: "caller",
			type: "string",
			required: true,
			maxLength: 8,
			format: "identifier",
		},
		{
			name: "status",
			source: "caller",
			type: "string",
			required: true,
			maxLength: 16,
			allowedValues: ["approved", "declined"],
		},
		{ name: "from_date", source: "caller", type: "date", required: true },
		{
			name: "limit",
			source: "caller",
			type: "int64",
			required: true,
			min: 1,
			max: 20,
		},
		{
			name: "min_amount",
			source: "caller",
			type: "float64",
			required: true,
			min: 0,
		},
		{ name: "pending", source: "caller", type: "bool", required: true },
	],
	columns: [
		{ name: "transaction_id", type: "string", classification: "financial" },
	],
	relations: [],
	allowedRoles: ["customer"],
	maxRows: 20,
	maximumBytesBilled: 1,
};

const caller = {
	product_id: "p-1",
	status: "approved",
	from_date: "2026-02-28",
	limit: 5,
	min_amount: 0,
	pending: false,
};

function bind(overrides: Record<string, unknown> = {}, customerId = "c-1") {
	return bindQueryParameters(entry, {
		caller: { ...caller, ...overrides },
		customerId,
		tenantId: "tenant-a",
	});
}

function reason(overrides: Record<string, unknown>) {
	const result = bind(overrides);
	return result.status === "invalid" ? result.reasonCode : "ready";
}

describe("bindQueryParameters", () => {
	test("injects session values and keeps filters to caller values only", () => {
		const result = bind();

		expect(result.status).toBe("ready");
		if (result.status === "ready") {
			expect(result.values).toMatchObject({
				...caller,
				customer_id: "c-1",
				tenant: "tenant-a",
			});
			expect(result.filters).toEqual(caller);
		}
	});

	test("a caller can neither supply nor name a session parameter", () => {
		expect(reason({ customer_id: "c-2" })).toBe("query_parameter_not_allowed");
		expect(reason({ tenant: "tenant-b" })).toBe("query_parameter_not_allowed");
		expect(reason({ extra: "x" })).toBe("query_parameter_not_allowed");
	});

	test("fails closed when the session is not linked to a customer", () => {
		const result = bindQueryParameters(entry, {
			caller,
			customerId: null,
			tenantId: "tenant-a",
		});

		expect(result).toEqual({
			status: "invalid",
			reasonCode: "query_customer_unlinked",
		});
	});

	test("reports a missing value separately from an invalid one", () => {
		expect(reason({ product_id: undefined })).toBe("query_parameter_missing");
		expect(reason({ from_date: null })).toBe("query_parameter_missing");
		expect(reason({ product_id: "p 1" })).toBe("query_parameter_invalid");
	});

	test("enforces string length, format and allowed values", () => {
		expect(reason({ product_id: "p-1234567" })).toBe("query_parameter_invalid");
		expect(reason({ product_id: "" })).toBe("query_parameter_invalid");
		expect(reason({ product_id: "p;DROP" })).toBe("query_parameter_invalid");
		expect(reason({ status: "refunded" })).toBe("query_parameter_invalid");
	});

	test("accepts only real calendar dates", () => {
		expect(reason({ from_date: "2026-02-30" })).toBe("query_parameter_invalid");
		expect(reason({ from_date: "2026-2-3" })).toBe("query_parameter_invalid");
		expect(reason({ from_date: "yesterday" })).toBe("query_parameter_invalid");
		expect(reason({ from_date: "2028-02-29" })).toBe("ready");
	});

	test("enforces numeric type and range without coercion", () => {
		expect(reason({ limit: 0 })).toBe("query_parameter_invalid");
		expect(reason({ limit: 21 })).toBe("query_parameter_invalid");
		expect(reason({ limit: 1.5 })).toBe("query_parameter_invalid");
		expect(reason({ limit: "5" })).toBe("query_parameter_invalid");
		expect(reason({ min_amount: -1 })).toBe("query_parameter_invalid");
		expect(reason({ min_amount: Number.NaN })).toBe("query_parameter_invalid");
		expect(reason({ pending: "false" })).toBe("query_parameter_invalid");
	});
});
