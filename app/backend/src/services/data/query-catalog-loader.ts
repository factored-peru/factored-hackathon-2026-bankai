import {
	type QueryCatalog,
	queryCatalogSchema,
} from "../../domain/data/query-catalog.js";
import {
	type SqlValidationOptions,
	validateQuerySql,
} from "./query-sql-validator.js";

export type QueryCatalogLoadResult =
	| Readonly<{ status: "ready"; catalog: QueryCatalog }>
	| Readonly<{
			status: "invalid";
			reasonCode:
				| "invalid_catalog_options"
				| "invalid_catalog_schema"
				| "invalid_catalog_sql";
			/** Safe to log: schema paths or `queryId@version: rule`, never SQL. */
			issues: readonly string[];
	  }>;

const NAME = /^[A-Za-z0-9_-]+$/;

/**
 * Validates a raw catalog document and resolves its `{project}` and
 * `{dataset}` placeholders from configuration, so the same file serves every
 * environment without naming a project in Git. Any invalid entry rejects the
 * whole catalog: a partially trusted catalog is never served.
 */
export function loadQueryCatalog(
	raw: unknown,
	options: SqlValidationOptions,
): QueryCatalogLoadResult {
	if (!NAME.test(options.project) || !NAME.test(options.dataset)) {
		return {
			status: "invalid",
			reasonCode: "invalid_catalog_options",
			issues: [],
		};
	}

	const parsed = queryCatalogSchema.safeParse(raw);
	if (!parsed.success) {
		return {
			status: "invalid",
			reasonCode: "invalid_catalog_schema",
			issues: parsed.error.issues.map(
				(issue) => `${issue.path.join(".")}: ${issue.code}`,
			),
		};
	}

	const catalog: QueryCatalog = {
		...parsed.data,
		entries: parsed.data.entries.map((entry) => ({
			...entry,
			sql: entry.sql
				.split("{project}")
				.join(options.project)
				.split("{dataset}")
				.join(options.dataset),
		})),
	};

	const issues: string[] = [];
	for (const entry of catalog.entries) {
		const result = validateQuerySql(entry, options);
		if (!result.valid) {
			issues.push(`${entry.queryId}@${entry.version}: ${result.rule}`);
		}
	}
	return issues.length > 0
		? { status: "invalid", reasonCode: "invalid_catalog_sql", issues }
		: { status: "ready", catalog };
}
