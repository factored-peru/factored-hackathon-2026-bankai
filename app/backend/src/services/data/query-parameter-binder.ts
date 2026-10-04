import type { QueryCatalogEntry } from "../../domain/data/query-catalog.js";
import type { QueryParameterValues } from "../ports/structured-query.js";

export type BindFailure =
	| "query_parameter_not_allowed"
	| "query_parameter_missing"
	| "query_parameter_invalid"
	| "query_customer_unlinked";

export type BindResult =
	| Readonly<{
			status: "ready";
			/** Every declared parameter, caller values plus session-injected ones. */
			values: QueryParameterValues;
			/** Only what the caller supplied; safe to show as applied filters. */
			filters: QueryParameterValues;
	  }>
	| Readonly<{ status: "invalid"; reasonCode: BindFailure }>;

const IDENTIFIER = /^[A-Za-z0-9_-]+$/;
const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

function isCalendarDate(value: string): boolean {
	const match = DATE.exec(value);
	if (match === null) {
		return false;
	}
	const [year, month, day] = [match[1], match[2], match[3]].map(Number) as [
		number,
		number,
		number,
	];
	const parsed = new Date(Date.UTC(year, month - 1, day));
	return (
		parsed.getUTCFullYear() === year &&
		parsed.getUTCMonth() === month - 1 &&
		parsed.getUTCDate() === day
	);
}

type CallerParameter = Extract<
	QueryCatalogEntry["parameters"][number],
	{ source: "caller" }
>;

function validCallerValue(
	parameter: CallerParameter,
	value: unknown,
): value is string | number | boolean {
	switch (parameter.type) {
		case "string":
			return (
				typeof value === "string" &&
				value.length >= 1 &&
				value.length <= parameter.maxLength &&
				(parameter.allowedValues === undefined ||
					parameter.allowedValues.includes(value)) &&
				(parameter.format !== "identifier" || IDENTIFIER.test(value))
			);
		case "date":
			return typeof value === "string" && isCalendarDate(value);
		case "int64":
			return (
				typeof value === "number" &&
				Number.isSafeInteger(value) &&
				(parameter.min === undefined || value >= parameter.min) &&
				(parameter.max === undefined || value <= parameter.max)
			);
		case "float64":
			return (
				typeof value === "number" &&
				Number.isFinite(value) &&
				(parameter.min === undefined || value >= parameter.min) &&
				(parameter.max === undefined || value <= parameter.max)
			);
		case "bool":
			return typeof value === "boolean";
	}
}

/**
 * Turns what a selector proposed into the exact values a query may run with.
 * Caller values are validated against the catalog definition; session values
 * come only from the verified session. A caller can never supply, override or
 * even name a session parameter such as `customer_id`.
 */
export function bindQueryParameters(
	entry: QueryCatalogEntry,
	input: {
		caller: Readonly<Record<string, unknown>>;
		customerId: string | null;
		tenantId: string;
	},
): BindResult {
	const callerParameters = entry.parameters.filter(
		(parameter): parameter is CallerParameter => parameter.source === "caller",
	);
	const allowed = new Set(callerParameters.map((parameter) => parameter.name));
	if (Object.keys(input.caller).some((name) => !allowed.has(name))) {
		return { status: "invalid", reasonCode: "query_parameter_not_allowed" };
	}

	const values: Record<string, string | number | boolean> = {};
	const filters: Record<string, string | number | boolean> = {};
	for (const parameter of callerParameters) {
		const value = input.caller[parameter.name];
		if (value === undefined || value === null) {
			return { status: "invalid", reasonCode: "query_parameter_missing" };
		}
		if (!validCallerValue(parameter, value)) {
			return { status: "invalid", reasonCode: "query_parameter_invalid" };
		}
		values[parameter.name] = value;
		filters[parameter.name] = value;
	}

	for (const parameter of entry.parameters) {
		if (parameter.source !== "session") {
			continue;
		}
		if (parameter.binding === "tenant_id") {
			values[parameter.name] = input.tenantId;
		} else {
			if (input.customerId === null) {
				return { status: "invalid", reasonCode: "query_customer_unlinked" };
			}
			values[parameter.name] = input.customerId;
		}
	}
	return { status: "ready", values, filters };
}
