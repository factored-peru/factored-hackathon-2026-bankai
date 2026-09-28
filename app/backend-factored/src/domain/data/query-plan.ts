import { z } from "zod";

export const queryFieldSchema = z.enum([
	"movement_id",
	"employee_id",
	"account_id",
	"occurred_at",
	"description",
	"amount_bucket",
	"status",
]);

export const queryPlanSchema = z
	.object({
		operation: z.literal("select"),
		resource: z.literal("employee_movements"),
		fields: z.array(queryFieldSchema).min(1),
		filters: z
			.array(
				z
					.object({
						field: z.enum([
							"employee_id",
							"account_id",
							"occurred_at",
							"status",
						]),
						operator: z.enum(["eq", "gte", "lte"]),
						value: z.union([z.string(), z.number()]),
					})
					.strict(),
			)
			.max(10),
		orderBy: z
			.object({ field: queryFieldSchema, direction: z.enum(["asc", "desc"]) })
			.strict()
			.nullable(),
		limit: z.number().int().positive().max(100),
	})
	.strict();

export type QueryPlan = z.infer<typeof queryPlanSchema>;
