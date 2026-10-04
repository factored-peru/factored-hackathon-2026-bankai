import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import type { QueryCatalogEntry } from "../src/domain/data/query-catalog.js";
import type { SessionContext } from "../src/domain/session.js";
import { FileQueryCatalogSource } from "../src/integrations/catalog/file-query-catalog-source.js";
import { loadQueryCatalog } from "../src/services/data/query-catalog-loader.js";
import { validateQuerySql } from "../src/services/data/query-sql-validator.js";
import { StructuredRagCatalogRepository } from "../src/services/retrieval/structured-catalog-repository.js";

const options = { project: "proj", dataset: "data" };

const session: SessionContext = {
	sessionId: "session-a",
	userId: "user-a",
	tenantId: "tenant-a",
	scopes: [],
	roles: ["customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: "2026-01-01T00:00:00.000Z",
	lastSeenAt: "2026-01-01T00:00:00.000Z",
	expiresAt: "2026-01-01T01:00:00.000Z",
	revokedAt: null,
};

const entry: QueryCatalogEntry = {
	queryId: "product_status",
	version: "v1",
	description: "Status of one product owned by the customer.",
	sql: "SELECT product_id, product_status FROM `proj.data.products` WHERE customer_id = @customer_id AND product_id = @product_id LIMIT 1",
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
	relations: [],
	allowedRoles: ["customer"],
	maxRows: 1,
	maximumBytesBilled: 50_000_000,
};

function ruleFor(sql: string, overrides: Partial<QueryCatalogEntry> = {}) {
	const result = validateQuerySql({ ...entry, sql, ...overrides }, options);
	return result.valid ? "valid" : result.rule;
}

describe("catalog SQL validator", () => {
	test("accepts the closed single-table shape", () => {
		expect(ruleFor(entry.sql)).toBe("valid");
	});

	test("rejects comments and statement separators", () => {
		expect(ruleFor(`${entry.sql}; DROP TABLE x`)).toBe("forbidden_syntax");
		expect(ruleFor(`${entry.sql} -- hi`)).toBe("forbidden_syntax");
		expect(ruleFor(`${entry.sql} /* hi */`)).toBe("forbidden_syntax");
	});

	test("rejects anything that is not a SELECT", () => {
		expect(ruleFor("DELETE FROM `proj.data.products`")).toBe("not_select");
		expect(
			ruleFor(
				"SELECT product_id FROM `proj.data.products` WHERE customer_id = @customer_id AND product_id = @product_id LIMIT 1 UNION ALL SELECT 1",
			),
		).toBe("forbidden_keyword");
	});

	test("rejects constructs that could bypass the ownership predicate", () => {
		const base = "SELECT product_id, product_status FROM `proj.data.products`";
		expect(
			ruleFor(
				`${base} WHERE customer_id = @customer_id OR 1 = 1 AND product_id = @product_id LIMIT 1`,
			),
		).toBe("forbidden_keyword");
		expect(
			ruleFor(
				`${base} JOIN \`proj.data.customers\` ON TRUE WHERE customer_id = @customer_id AND product_id = @product_id LIMIT 1`,
			),
		).toBe("forbidden_keyword");
		expect(
			ruleFor(
				"SELECT product_id, product_status FROM `proj.data.products` WHERE product_id IN (SELECT product_id FROM `proj.data.products`) AND customer_id = @customer_id AND product_id = @product_id LIMIT 1",
			),
		).toBe("subquery_or_multiple_sources");
	});

	test("rejects star projections", () => {
		expect(
			ruleFor(
				"SELECT * FROM `proj.data.products` WHERE customer_id = @customer_id AND product_id = @product_id LIMIT 1",
			),
		).toBe("star_projection");
	});

	test("rejects tables outside the configured project and dataset", () => {
		expect(
			ruleFor(entry.sql.replace("proj.data.products", "other.data.products")),
		).toBe("table_not_allowed");
		expect(
			ruleFor(entry.sql.replace("proj.data.products", "proj.other.products")),
		).toBe("table_not_allowed");
		expect(ruleFor(entry.sql.replace("`proj.data.products`", "products"))).toBe(
			"table_not_allowed",
		);
	});

	test("requires every @param to be declared and used", () => {
		expect(
			ruleFor(`${entry.sql.replace("LIMIT 1", "AND x = @ghost LIMIT 1")}`),
		).toBe("undeclared_parameter");
		expect(
			ruleFor(entry.sql.replace(" AND product_id = @product_id", "")),
		).toBe("unused_parameter");
	});

	test("requires the ownership predicate right after WHERE", () => {
		expect(
			ruleFor(
				"SELECT product_id, product_status FROM `proj.data.products` WHERE product_id = @product_id AND customer_id = @customer_id LIMIT 1",
			),
		).toBe("missing_customer_predicate");
		expect(
			ruleFor(entry.sql, {
				parameters: entry.parameters.filter(
					(parameter) => parameter.name !== "customer_id",
				),
			}),
		).toBe("undeclared_parameter");
	});

	test("requires a literal LIMIT within maxRows", () => {
		expect(ruleFor(entry.sql.replace(" LIMIT 1", ""))).toBe(
			"missing_or_excess_limit",
		);
		expect(ruleFor(entry.sql.replace("LIMIT 1", "LIMIT 5000"))).toBe(
			"missing_or_excess_limit",
		);
		expect(ruleFor(entry.sql.replace("LIMIT 1", "LIMIT @product_id"))).toBe(
			"missing_or_excess_limit",
		);
	});

	test("requires every declared column to be selected", () => {
		expect(ruleFor(entry.sql.replace(", product_status", ""))).toBe(
			"column_not_selected",
		);
	});
});

describe("catalog loader", () => {
	const catalog = {
		kind: "structured",
		version: "test-1",
		entries: [
			{
				...entry,
				sql: entry.sql.replace("proj.data", "{project}.{dataset}"),
			},
		],
	};

	test("resolves placeholders from configuration", () => {
		const result = loadQueryCatalog(catalog, options);

		expect(result.status).toBe("ready");
		if (result.status === "ready") {
			expect(result.catalog.entries[0]?.sql).toContain("`proj.data.products`");
		}
	});

	test("reports schema problems by path without echoing values", () => {
		const result = loadQueryCatalog({ ...catalog, kind: "other" }, options);

		expect(result).toMatchObject({
			status: "invalid",
			reasonCode: "invalid_catalog_schema",
		});
	});

	test("rejects the whole catalog when one entry has unsafe SQL", () => {
		const unsafe = {
			...catalog,
			entries: [
				catalog.entries[0],
				{ ...catalog.entries[0], version: "v2", sql: "DROP TABLE x" },
			],
		};
		const result = loadQueryCatalog(unsafe, options);

		expect(result.status).toBe("invalid");
		if (result.status === "invalid") {
			expect(result.reasonCode).toBe("invalid_catalog_sql");
			expect(result.issues).toEqual(["product_status@v2: not_select"]);
			expect(JSON.stringify(result.issues)).not.toContain("DROP");
		}
	});

	test("rejects unsafe project or dataset configuration", () => {
		expect(
			loadQueryCatalog(catalog, { project: "p`; DROP", dataset: "data" }),
		).toMatchObject({ reasonCode: "invalid_catalog_options" });
	});
});

describe("StructuredRagCatalogRepository", () => {
	const document = {
		kind: "structured",
		version: "test-1",
		entries: [
			entry,
			{ ...entry, queryId: "advisor_only", allowedRoles: ["advisor"] },
		],
	};
	const source = { read: async () => structuredClone(document) };

	test("lists only entries the session role may use, without SQL", async () => {
		const repository = new StructuredRagCatalogRepository(source, options);
		const result = await repository.load({ session, traceId: "t" });

		expect(result.status).toBe("ready");
		if (result.status === "ready") {
			expect(result.catalog.entries.map((item) => item.id)).toEqual([
				"product_status",
			]);
			expect(JSON.stringify(result.catalog)).not.toContain("SELECT");
			expect(result.catalog.entries[0]?.description).toBe(entry.description);
		}
	});

	test("fails closed when no entry is allowed for the role", async () => {
		const repository = new StructuredRagCatalogRepository(source, options);

		expect(
			await repository.load({
				session: { ...session, roles: ["guest"] },
				traceId: "t",
			}),
		).toEqual({
			status: "unavailable",
			reasonCode: "structured_catalog_no_entries",
		});
	});

	test("fails closed when the source is unreadable or invalid", async () => {
		const broken = new StructuredRagCatalogRepository(
			{
				read: async () => {
					throw new Error("boom");
				},
			},
			options,
		);
		const invalid = new StructuredRagCatalogRepository(
			{ read: async () => ({ kind: "structured" }) },
			options,
		);

		for (const repository of [broken, invalid]) {
			expect(await repository.load({ session, traceId: "t" })).toEqual({
				status: "unavailable",
				reasonCode: "structured_catalog_unavailable",
			});
		}
	});

	test("resolves a full entry only for an allowed role", async () => {
		const repository = new StructuredRagCatalogRepository(source, options);

		expect(
			(
				await repository.resolve({
					session,
					queryId: "product_status",
					version: "v1",
				})
			)?.sql,
		).toContain("customer_id = @customer_id");
		expect(
			await repository.resolve({
				session,
				queryId: "advisor_only",
				version: "v1",
			}),
		).toBeNull();
		expect(
			await repository.resolve({
				session,
				queryId: "product_status",
				version: "v9",
			}),
		).toBeNull();
	});
});

describe("example catalog file", () => {
	test("passes the loader with configured names", async () => {
		const source = new FileQueryCatalogSource(
			resolve(import.meta.dir, "../config/structured-catalog.example.json"),
		);
		const result = loadQueryCatalog(await source.read(), options);

		expect(result).toMatchObject({ status: "ready" });
	});
});
