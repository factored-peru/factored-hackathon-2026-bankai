import { z } from "zod";
import { riskLevelSchema } from "../control/contracts.js";

/**
 * Closed contract for everything that may leave the process as telemetry
 * (OTel spans, OTel metric attributes, Langfuse via OTLP, BigQuery records).
 * ADR 0012 / 0015: metadata only. Every value is shape-constrained so free
 * text cannot pass even under an allowed key.
 */

/** Evaluator metrics. A new evaluator metric must be added here on purpose. */
export const evaluationMetricNames = [
	"route_correct",
	"trajectory_in_order",
	"policy_allowed",
	"within_budget",
	"tenant_isolated",
	"guardrail_passed",
	"response_sanitized",
	"result_verified",
	"structured_catalog_and_evidence",
	"kg_catalog_before_jev_and_evidence",
	"kg_fixture_selection_matches",
	"baseline_ungated_shape",
	"baseline_model_completed",
	"baseline_duration_recorded",
	"baseline_retrieval_attempts_recorded",
] as const;
export const evaluationMetricSchema = z.enum(evaluationMetricNames);
export type EvaluationMetricName = z.infer<typeof evaluationMetricSchema>;

/** Causal order of ADR 0012; one span name per stage. */
export const telemetrySpanNames = [
	"conversation",
	"session",
	"input_privacy",
	"model_armor",
	"primary_jev",
	"catalog",
	"specialized_jev",
	"policy",
	"retrieval_or_tool",
	"response_privacy",
	"durable_audit",
	"evaluation",
] as const;
export const telemetrySpanNameSchema = z.enum(telemetrySpanNames);

export const telemetryRouteSchema = z.enum([
	"llm",
	"structured_rag",
	"kg_rag",
	"ood",
]);
export const telemetryLabelSchema = z.enum(["pass", "fail", "skipped"]);
/** Which conversation pipeline produced a live run; the baseline is ungated. */
export const telemetryPipelineSchema = z.enum(["baseline", "controlled"]);
/** Small non-negative counts (model calls, retrieval attempts). */
export const telemetryCounterSchema = z
	.number()
	.int()
	.nonnegative()
	.max(10_000);
export const telemetryGuardrailStatusSchema = z.enum([
	"NO_MATCH_FOUND",
	"MATCH_FOUND",
	"FAILURE",
	"SKIPPED",
]);

/** Versions and fixture IDs: short, no whitespace, no free text. */
export const telemetryIdentifierSchema = z
	.string()
	.regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/);
/** Outcomes and reason codes: lower snake_case codes. */
export const telemetryCodeSchema = z.string().regex(/^[a-z][a-z0-9_]{0,63}$/);
/** Keyed-hash pseudonym (hex). Never a raw trace, session or tenant ID. */
export const telemetryPseudonymSchema = z.string().regex(/^[a-f0-9]{32}$/);

/** Spans may carry per-trace pseudonyms; metrics never do. */
const spanAttributeSchema = z
	.object({
		"bankai.correlator": telemetryPseudonymSchema,
		"bankai.span": telemetrySpanNameSchema,
		"bankai.outcome": telemetryCodeSchema,
		"bankai.route": telemetryRouteSchema,
		"bankai.policy_id": telemetryIdentifierSchema,
		"bankai.policy_version": telemetryIdentifierSchema,
		"bankai.catalog_version": telemetryIdentifierSchema,
		"bankai.risk_level": riskLevelSchema,
		"bankai.tool_id": telemetryIdentifierSchema,
		"bankai.guardrail_status": telemetryGuardrailStatusSchema,
		"bankai.latency_ms": z.number().nonnegative().finite(),
		// Facts of one live run (ADR 0012): counters and a closed error code.
		"bankai.pipeline": telemetryPipelineSchema,
		"bankai.model_calls": telemetryCounterSchema,
		"bankai.retrieval_attempts": telemetryCounterSchema,
		"bankai.retrieval_successes": telemetryCounterSchema,
		"bankai.error_code": telemetryCodeSchema,
		"bankai.session_hash": telemetryPseudonymSchema,
		"bankai.tenant_hash": telemetryPseudonymSchema,
		"eval.fixture_id": telemetryIdentifierSchema,
		"eval.route": telemetryRouteSchema,
		"eval.policy_version": telemetryIdentifierSchema,
		"eval.catalog_version": telemetryIdentifierSchema,
		"eval.matrix_version": telemetryIdentifierSchema,
	})
	.partial()
	.strict();

/** Low-cardinality only: enumerations and versions, no IDs or hashes. */
const metricAttributeSchema = z
	.object({
		"bankai.span": telemetrySpanNameSchema,
		"bankai.outcome": telemetryCodeSchema,
		"bankai.route": telemetryRouteSchema,
		"bankai.pipeline": telemetryPipelineSchema,
		"bankai.risk_level": riskLevelSchema,
		"bankai.guardrail_status": telemetryGuardrailStatusSchema,
		"eval.metric": evaluationMetricSchema,
		"eval.label": telemetryLabelSchema,
		"eval.evaluator": telemetryCodeSchema,
		"eval.evaluator_version": telemetryIdentifierSchema,
	})
	.partial()
	.strict();

/** `eval.<metric>.<field>` keys: the metric must belong to the closed catalog. */
const evaluationResultKey = /^eval\.([a-z0-9_]+)\.(score|label|reason_code)$/;
const evaluationResultFieldSchemas = {
	score: z.number().min(0).max(1),
	label: telemetryLabelSchema,
	reason_code: telemetryCodeSchema,
} as const;

/** Keys that signal content; rejected by name before any shape check. */
export const forbiddenContentKeys = [
	"prompt",
	"input",
	"output",
	"response",
	"messages",
	"content",
	"argument",
	"arguments",
	"sql",
	"chunk",
	"chunks",
	"password",
	"secret",
	"token",
	"cookie",
	"sessionid",
	"userid",
	"customerid",
	"tenantid",
	"traceid",
] as const;

export type TelemetryAttributeValue = string | number;
export type TelemetryAttributes = Readonly<
	Record<string, TelemetryAttributeValue>
>;

/**
 * Raised when an attribute is rejected. The message names the key only: a
 * value may be the very content the contract exists to keep out.
 */
export class TelemetryAttributeError extends Error {
	constructor(
		readonly reason: "forbidden_key" | "unknown_key" | "invalid_value",
		readonly key: string,
	) {
		super(`telemetry_attribute_rejected:${reason}:${safeKeyLabel(key)}`);
		this.name = "TelemetryAttributeError";
	}
}

function safeKeyLabel(key: string): string {
	return /^[A-Za-z0-9_.-]{1,64}$/.test(key) ? key : "malformed_key";
}

function assertKeyAllowed(key: string): void {
	const lower = key.toLowerCase();
	const segments = lower.split(".");
	if (forbiddenContentKeys.some((name) => segments.includes(name))) {
		throw new TelemetryAttributeError("forbidden_key", key);
	}
}

function validateWith(
	schema: z.ZodType<Record<string, unknown>>,
	attributes: Readonly<Record<string, unknown>>,
): TelemetryAttributes {
	const parsed = schema.safeParse(attributes);
	if (!parsed.success) {
		const issue = parsed.error.issues[0];
		if (issue?.code === "unrecognized_keys") {
			throw new TelemetryAttributeError(
				"unknown_key",
				issue.keys[0] ?? "malformed_key",
			);
		}
		throw new TelemetryAttributeError(
			"invalid_value",
			String(issue?.path[0] ?? ""),
		);
	}
	const clean: Record<string, TelemetryAttributeValue> = {};
	for (const [key, value] of Object.entries(parsed.data)) {
		if (value !== undefined) {
			clean[key] = value as TelemetryAttributeValue;
		}
	}
	return clean;
}

/** Validates span attributes; throws `TelemetryAttributeError` on any breach. */
export function validateSpanAttributes(
	attributes: Readonly<Record<string, unknown>>,
): TelemetryAttributes {
	const fixed: Record<string, unknown> = {};
	const dynamic: Record<string, TelemetryAttributeValue> = {};
	for (const [key, value] of Object.entries(attributes)) {
		assertKeyAllowed(key);
		const match = evaluationResultKey.exec(key);
		if (match === null) {
			fixed[key] = value;
			continue;
		}
		const metric = evaluationMetricSchema.safeParse(match[1]);
		if (!metric.success) {
			throw new TelemetryAttributeError("unknown_key", key);
		}
		const field = match[2] as keyof typeof evaluationResultFieldSchemas;
		const parsed = evaluationResultFieldSchemas[field].safeParse(value);
		if (!parsed.success) {
			throw new TelemetryAttributeError("invalid_value", key);
		}
		dynamic[key] = parsed.data;
	}
	return { ...validateWith(spanAttributeSchema, fixed), ...dynamic };
}

/** Validates the attributes of an OTel metric (low cardinality only). */
export function validateMetricAttributes(
	attributes: Readonly<Record<string, unknown>>,
): TelemetryAttributes {
	for (const key of Object.keys(attributes)) {
		assertKeyAllowed(key);
	}
	return validateWith(metricAttributeSchema, attributes);
}
