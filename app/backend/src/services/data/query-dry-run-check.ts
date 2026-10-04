import type { QueryCatalogEntry } from "../../domain/data/query-catalog.js";
import type { DryRunResult } from "../ports/structured-query.js";

const TYPE_BY_BIGQUERY: Readonly<Record<string, string>> = {
	STRING: "string",
	INT64: "int64",
	INTEGER: "int64",
	FLOAT64: "float64",
	FLOAT: "float64",
	BOOL: "bool",
	BOOLEAN: "bool",
	DATE: "date",
	TIMESTAMP: "timestamp",
};

export type DryRunCheck =
	| Readonly<{ valid: true }>
	| Readonly<{ valid: false; rule: string }>;

/**
 * Compares a successful dry run with what the catalog entry declares: the same
 * columns with the same types, and an estimate within the billed-bytes cap.
 * The static SQL checks cannot see the real schema; this closes that gap.
 */
export function checkDryRun(
	entry: QueryCatalogEntry,
	dryRun: Extract<DryRunResult, { status: "ready" }>,
): DryRunCheck {
	const actual = new Map(
		dryRun.schema.map((field) => [field.name, field.type.toUpperCase()]),
	);
	if (
		actual.size !== entry.columns.length ||
		entry.columns.some((column) => !actual.has(column.name))
	) {
		return { valid: false, rule: "schema_column_mismatch" };
	}
	for (const column of entry.columns) {
		if (TYPE_BY_BIGQUERY[actual.get(column.name) ?? ""] !== column.type) {
			return { valid: false, rule: "schema_type_mismatch" };
		}
	}
	if (dryRun.bytesProcessed === null) {
		return { valid: false, rule: "bytes_unknown" };
	}
	if (dryRun.bytesProcessed > entry.maximumBytesBilled) {
		return { valid: false, rule: "bytes_over_budget" };
	}
	return { valid: true };
}
