import {
	type QueryPlan,
	queryPlanSchema,
} from "../../domain/data/query-plan.js";

export type QueryPlanValidation =
	| Readonly<{ status: "valid"; plan: QueryPlan }>
	| Readonly<{ status: "invalid"; reasonCode: string }>;

export class QueryPlanService {
	validate(candidate: unknown): QueryPlanValidation {
		const parsed = queryPlanSchema.safeParse(candidate);
		return parsed.success
			? { status: "valid", plan: parsed.data }
			: { status: "invalid", reasonCode: "invalid_query_plan" };
	}
}
