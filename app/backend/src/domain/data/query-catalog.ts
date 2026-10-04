import { z } from "zod";
import { dataClassificationSchema } from "../control/contracts.js";

/** Hard ceilings: a catalog entry may lower them, never raise them. */
export const MAX_QUERY_ROWS = 1000;
export const MAX_BYTES_BILLED_CEILING = 1024 * 1024 * 1024;

const identifierSchema = z.string().regex(/^[a-z][a-z0-9_]*$/);

/**
 * Bound in SQL as `@name`. The model and the browser can only supply values
 * for `caller` parameters; they never see or change the SQL text.
 */
const callerParameterBase = {
	name: identifierSchema,
	source: z.literal("caller"),
	required: z.boolean(),
};

const callerParameterSchema = z.discriminatedUnion("type", [
	z
		.object({
			...callerParameterBase,
			type: z.literal("string"),
			maxLength: z.number().int().min(1).max(128),
			allowedValues: z.array(z.string().min(1)).min(1).optional(),
			format: z.literal("identifier").optional(),
		})
		.strict(),
	z
		.object({
			...callerParameterBase,
			type: z.literal("int64"),
			min: z.number().int().optional(),
			max: z.number().int().optional(),
		})
		.strict(),
	z
		.object({
			...callerParameterBase,
			type: z.literal("float64"),
			min: z.number().optional(),
			max: z.number().optional(),
		})
		.strict(),
	z.object({ ...callerParameterBase, type: z.literal("bool") }).strict(),
	z.object({ ...callerParameterBase, type: z.literal("date") }).strict(),
]);

/**
 * Filled by the backend from the verified session. A caller can never provide
 * these values, even when it sends a parameter with the same name.
 */
const sessionParameterSchema = z
	.object({
		name: identifierSchema,
		source: z.literal("session"),
		type: z.literal("string"),
		binding: z.enum(["customer_id", "tenant_id"]),
	})
	.strict();

export const queryParameterSchema = z.union([
	callerParameterSchema,
	sessionParameterSchema,
]);
export type QueryParameter = z.infer<typeof queryParameterSchema>;

export const queryColumnSchema = z
	.object({
		name: identifierSchema,
		type: z.enum(["string", "int64", "float64", "bool", "date", "timestamp"]),
		classification: dataClassificationSchema,
	})
	.strict();
export type QueryColumn = z.infer<typeof queryColumnSchema>;

export const queryRelationSchema = z
	.object({
		column: identifierSchema,
		references: z.string().min(1),
	})
	.strict();
export type QueryRelation = z.infer<typeof queryRelationSchema>;

function duplicates(values: readonly string[]): boolean {
	return new Set(values).size !== values.length;
}

/**
 * One authorized query. `sql` is a parameterized `SELECT` template; the
 * structural checks that need to read it (single statement, only declared
 * `@params`, allowed columns) belong to the catalog loader, not to this shape.
 */
export const queryCatalogEntrySchema = z
	.object({
		queryId: identifierSchema,
		version: z.string().min(1),
		/** The only text the selecting judge sees; it never receives `sql`. */
		description: z.string().min(1).max(500),
		sql: z.string().min(1),
		parameters: z.array(queryParameterSchema),
		columns: z.array(queryColumnSchema).min(1),
		relations: z.array(queryRelationSchema).default([]),
		allowedRoles: z.array(z.string().min(1)).min(1),
		maxRows: z.number().int().min(1).max(MAX_QUERY_ROWS),
		maximumBytesBilled: z.number().int().min(1).max(MAX_BYTES_BILLED_CEILING),
	})
	.strict()
	.superRefine((entry, context) => {
		if (duplicates(entry.parameters.map((parameter) => parameter.name))) {
			context.addIssue({
				code: "custom",
				path: ["parameters"],
				message: "Duplicate parameter name",
			});
		}
		if (duplicates(entry.columns.map((column) => column.name))) {
			context.addIssue({
				code: "custom",
				path: ["columns"],
				message: "Duplicate column name",
			});
		}
		const columnNames = new Set(entry.columns.map((column) => column.name));
		for (const relation of entry.relations) {
			if (!columnNames.has(relation.column)) {
				context.addIssue({
					code: "custom",
					path: ["relations"],
					message: "Relation points to a column the query does not return",
				});
			}
		}
	});
export type QueryCatalogEntry = z.infer<typeof queryCatalogEntrySchema>;

export const queryCatalogSchema = z
	.object({
		kind: z.literal("structured"),
		version: z.string().min(1),
		entries: z.array(queryCatalogEntrySchema).min(1),
	})
	.strict()
	.superRefine((catalog, context) => {
		const keys = catalog.entries.map(
			(entry) => `${entry.queryId}@${entry.version}`,
		);
		if (duplicates(keys)) {
			context.addIssue({
				code: "custom",
				path: ["entries"],
				message: "Duplicate queryId and version",
			});
		}
	});
export type QueryCatalog = z.infer<typeof queryCatalogSchema>;
