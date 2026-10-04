import type { QueryCatalogEntry } from "../../domain/data/query-catalog.js";

export type SqlValidationOptions = Readonly<{
	project: string;
	dataset: string;
}>;

export type SqlValidation =
	| Readonly<{ valid: true }>
	| Readonly<{ valid: false; rule: string }>;

// Anything that writes, changes scope, widens a result or leaves the dataset.
// OR, UNION and JOIN are rejected so the ownership predicate can only be
// narrowed by further AND conditions, never bypassed.
const FORBIDDEN_KEYWORDS =
	/\b(INSERT|UPDATE|DELETE|MERGE|DROP|CREATE|ALTER|TRUNCATE|GRANT|REVOKE|CALL|EXECUTE|EXPORT|LOAD|DECLARE|SET|BEGIN|COMMIT|ROLLBACK|ASSERT|WITH|OR|UNION|INTERSECT|EXCEPT|JOIN|EXTERNAL_QUERY|INFORMATION_SCHEMA)\b/i;

function fail(rule: string): SqlValidation {
	return { valid: false, rule };
}

/**
 * Static checks on a catalog SQL template whose `{project}` and `{dataset}`
 * placeholders were already resolved. It is an allowlist of one shape:
 *
 *   SELECT <explicit columns> FROM `project.dataset.table`
 *   WHERE customer_id = @<session param> [AND ...] [ORDER BY ...] LIMIT <n>
 *
 * Whatever does not fit is rejected, so a mistake in the catalog fails closed.
 * Result columns are additionally checked against a BigQuery dry run when the
 * executor is connected.
 */
export function validateQuerySql(
	entry: QueryCatalogEntry,
	options: SqlValidationOptions,
): SqlValidation {
	const raw = entry.sql;
	if (/--|#|\/\*|;|@@/.test(raw)) {
		return fail("forbidden_syntax");
	}
	if ((raw.match(/`/g) ?? []).length % 2 !== 0) {
		return fail("unbalanced_quote");
	}

	const identifiers = [...raw.matchAll(/`([^`]*)`/g)].map((match) => match[1]);
	const stripped = raw
		.replace(/`[^`]*`/g, " IDENT ")
		.replace(/'(?:[^'\\]|\\.)*'/g, " STR ")
		.replace(/"(?:[^"\\]|\\.)*"/g, " STR ");
	if (/['"\\]/.test(stripped)) {
		return fail("unbalanced_quote");
	}

	if (!/^\s*SELECT\b/i.test(stripped)) {
		return fail("not_select");
	}
	if (FORBIDDEN_KEYWORDS.test(stripped)) {
		return fail("forbidden_keyword");
	}
	if (
		(stripped.match(/\bSELECT\b/gi) ?? []).length !== 1 ||
		(stripped.match(/\bFROM\b/gi) ?? []).length !== 1
	) {
		return fail("subquery_or_multiple_sources");
	}
	if (stripped.includes("*")) {
		return fail("star_projection");
	}

	const [table, ...otherIdentifiers] = identifiers;
	const allowedTable = new RegExp(
		`^${escapeRegExp(options.project)}\\.${escapeRegExp(options.dataset)}\\.[A-Za-z0-9_]+$`,
	);
	if (
		table === undefined ||
		otherIdentifiers.length > 0 ||
		!allowedTable.test(table) ||
		!/\bFROM\s+IDENT\b/.test(stripped)
	) {
		return fail("table_not_allowed");
	}

	const declared = new Set(entry.parameters.map((parameter) => parameter.name));
	const referenced = new Set(
		[...stripped.matchAll(/@([A-Za-z_]\w*)/g)].map((match) => match[1] ?? ""),
	);
	for (const name of referenced) {
		if (!declared.has(name)) {
			return fail("undeclared_parameter");
		}
	}
	for (const name of declared) {
		if (!referenced.has(name)) {
			return fail("unused_parameter");
		}
	}

	const owner = entry.parameters.find(
		(parameter) =>
			parameter.source === "session" && parameter.binding === "customer_id",
	);
	if (owner === undefined) {
		return fail("missing_customer_binding");
	}
	const ownership = new RegExp(
		`\\bWHERE\\s+customer_id\\s*=\\s*@${escapeRegExp(owner.name)}\\b`,
		"i",
	);
	if (!ownership.test(stripped)) {
		return fail("missing_customer_predicate");
	}

	const limit = /\bLIMIT\s+(\d+)\s*$/i.exec(stripped.trim());
	const limitValue = limit?.[1] === undefined ? Number.NaN : Number(limit[1]);
	if (!(limitValue >= 1 && limitValue <= entry.maxRows)) {
		return fail("missing_or_excess_limit");
	}

	for (const column of entry.columns) {
		if (!new RegExp(`\\b${escapeRegExp(column.name)}\\b`).test(stripped)) {
			return fail("column_not_selected");
		}
	}
	return { valid: true };
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
