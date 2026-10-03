import { z } from "zod";

const queryIdSchema = z.string().regex(/^[a-z][a-z0-9_]{2,62}$/);
const queryParameterValueSchema = z.union([
	z.string(),
	z.number(),
	z.boolean(),
]);

/** A catalog reference, never caller-provided SQL, table names or columns. */
export const queryPlanSchema = z
	.object({
		queryId: queryIdSchema,
		parameters: z.record(z.string(), queryParameterValueSchema),
	})
	.refine((plan) => !("tenant_id" in plan.parameters), {
		message: "tenant_id is injected by the server.",
	})
	.strict();

export type QueryPlan = z.infer<typeof queryPlanSchema>;

/**
 * Immutable server-side definition. SQL is reviewed source code, never API,
 * prompt, browser or model input. The query must use the injected tenant scope.
 */
export const structuredQueryDefinitionSchema = z
	.object({
		queryId: queryIdSchema,
		version: z.string().regex(/^v[0-9]+$/),
		sql: z
			.string()
			.regex(/^\s*SELECT\b/i)
			.refine((sql) => !/[;]|--|\/\*/.test(sql), {
				message: "Only a single comment-free SELECT statement is allowed.",
			})
			.refine((sql) => /@tenant_id\b/.test(sql), {
				message: "Structured queries must bind the server tenant parameter.",
			}),
		parameterNames: z.array(z.string().regex(/^[a-z][a-z0-9_]{0,62}$/)),
		allowedRoles: z.array(z.string().min(1)).min(1),
		maximumBytesBilled: z.number().int().positive().safe(),
		timeoutMs: z.number().int().positive().max(30_000),
		maximumRows: z.number().int().positive().max(8),
	})
	.strict();

export type StructuredQueryDefinition = z.infer<
	typeof structuredQueryDefinitionSchema
>;
