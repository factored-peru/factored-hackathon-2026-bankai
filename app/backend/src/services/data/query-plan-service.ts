import {
	type QueryPlan,
	queryPlanSchema,
} from "../../domain/data/query-plan.js";

export type QueryPlanValidation =
	| Readonly<{ status: "valid"; plan: QueryPlan }>
	| Readonly<{ status: "invalid"; reasonCode: string }>;

export class QueryPlanService {
	constructor(private readonly allowedQueryIds: readonly string[] = []) {}

	validate(candidate: unknown): QueryPlanValidation {
		const parsed = queryPlanSchema.safeParse(candidate);
		if (!parsed.success) {
			return { status: "invalid", reasonCode: "invalid_query_plan" };
		}
		return this.allowedQueryIds.includes(parsed.data.queryId)
			? { status: "valid", plan: parsed.data }
			: { status: "invalid", reasonCode: "query_plan_not_catalogued" };
	}
}
