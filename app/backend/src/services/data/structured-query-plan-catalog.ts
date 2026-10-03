import {
	type QueryPlan,
	queryPlanSchema,
	type StructuredQueryDefinition,
	structuredQueryDefinitionSchema,
} from "../../domain/data/query-plan.js";
import type { SessionContext } from "../../domain/session.js";

export type StructuredQueryResolution =
	| Readonly<{
			status: "ready";
			definition: StructuredQueryDefinition;
			plan: QueryPlan;
	  }>
	| Readonly<{ status: "unavailable"; reasonCode: string }>;

/**
 * Versioned in-process query catalog. It deliberately has no dynamic loader:
 * a new BigQuery operation is a reviewed source change, not user input.
 */
export class StructuredQueryPlanCatalog {
	private readonly byId: ReadonlyMap<string, StructuredQueryDefinition>;

	constructor(
		readonly version: string,
		definitions: readonly StructuredQueryDefinition[],
	) {
		this.byId = new Map(
			definitions.map((definition) => [
				structuredQueryDefinitionSchema.parse(definition).queryId,
				structuredQueryDefinitionSchema.parse(definition),
			]),
		);
	}

	entriesFor(session: SessionContext) {
		return [...this.byId.values()]
			.filter((definition) =>
				definition.allowedRoles.some((role) => session.roles.includes(role)),
			)
			.map(({ queryId, version, allowedRoles }) => ({
				id: queryId,
				version,
				allowedRoles,
			}));
	}

	resolve(
		candidate: unknown,
		session: SessionContext,
	): StructuredQueryResolution {
		const parsed = queryPlanSchema.safeParse(candidate);
		if (!parsed.success) {
			return { status: "unavailable", reasonCode: "invalid_query_plan" };
		}
		const definition = this.byId.get(parsed.data.queryId);
		if (!definition) {
			return { status: "unavailable", reasonCode: "query_plan_not_catalogued" };
		}
		if (!definition.allowedRoles.some((role) => session.roles.includes(role))) {
			return { status: "unavailable", reasonCode: "query_plan_not_authorized" };
		}
		const expected = [...definition.parameterNames].sort();
		const received = Object.keys(parsed.data.parameters).sort();
		if (
			expected.length !== received.length ||
			expected.some((name, index) => name !== received[index])
		) {
			return {
				status: "unavailable",
				reasonCode: "query_plan_parameters_invalid",
			};
		}
		return { status: "ready", definition, plan: parsed.data };
	}
}
