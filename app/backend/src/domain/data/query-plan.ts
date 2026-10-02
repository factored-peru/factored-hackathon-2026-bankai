import { z } from "zod";

/** A catalog reference, never caller-provided SQL, table names or columns. */
export const queryPlanSchema = z
	.object({
		queryId: z.string().min(1),
		parameters: z.record(
			z.string(),
			z.union([z.string(), z.number(), z.boolean()]),
		),
	})
	.strict();

export type QueryPlan = z.infer<typeof queryPlanSchema>;
