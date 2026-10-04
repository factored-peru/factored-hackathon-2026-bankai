import type { QueryColumn } from "../../domain/data/query-catalog.js";
import type { QueryCell } from "../ports/structured-query.js";

function cellFor(column: QueryColumn, value: unknown): QueryCell | undefined {
	if (value === null || value === undefined) {
		return null;
	}
	switch (column.type) {
		case "string":
		case "date":
		case "timestamp":
			return typeof value === "string" ? value : undefined;
		case "int64":
			return typeof value === "number" && Number.isSafeInteger(value)
				? value
				: undefined;
		case "float64":
			return typeof value === "number" && Number.isFinite(value)
				? value
				: undefined;
		case "bool":
			return typeof value === "boolean" ? value : undefined;
	}
}

/**
 * Keeps exactly the declared columns and checks each cell against its declared
 * type. Anything else in a row is dropped; a missing column or a mistyped cell
 * returns `null` so the caller fails closed instead of exposing a guess.
 */
export function projectRows(
	columns: readonly QueryColumn[],
	rows: readonly Readonly<Record<string, unknown>>[],
): Record<string, QueryCell>[] | null {
	const projected: Record<string, QueryCell>[] = [];
	for (const row of rows) {
		const next: Record<string, QueryCell> = {};
		for (const column of columns) {
			if (!(column.name in row)) {
				return null;
			}
			const cell = cellFor(column, row[column.name]);
			if (cell === undefined) {
				return null;
			}
			next[column.name] = cell;
		}
		projected.push(next);
	}
	return projected;
}
