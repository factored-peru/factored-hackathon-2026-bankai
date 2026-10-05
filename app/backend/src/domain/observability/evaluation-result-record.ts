import { z } from "zod";
import {
	evaluationMetricSchema,
	telemetryCodeSchema,
	telemetryIdentifierSchema,
	telemetryLabelSchema,
	telemetryPseudonymSchema,
	telemetryRouteSchema,
} from "./telemetry-attributes.js";

export const evaluationResultRecordSchemaVersion = "v1" as const;

/**
 * One sanitized, versioned evaluation result as persisted to BigQuery
 * (ADR 0012 / 0015). No prompts, answers, evidence text, PII or raw IDs; the
 * only per-run link back to a trace is the keyed `correlator` pseudonym, the
 * same one Langfuse receives on its spans. Fields map to snake_case columns
 * in the adapter.
 */
export const evaluationResultRecordSchema = z
	.object({
		schemaVersion: z.literal(evaluationResultRecordSchemaVersion),
		/** Opaque ID of one evaluation run; shared by every row of the run. */
		runId: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/),
		matrixVersion: telemetryIdentifierSchema,
		fixtureId: telemetryIdentifierSchema,
		route: telemetryRouteSchema,
		metric: evaluationMetricSchema,
		score: z.number().min(0).max(1),
		passed: z.boolean(),
		label: telemetryLabelSchema,
		reasonCode: telemetryCodeSchema.nullable(),
		evaluator: telemetryCodeSchema,
		evaluatorVersion: telemetryIdentifierSchema,
		mode: z.enum(["deterministic", "jev", "llm"]),
		/** P0 scores are informational; a blocking gate needs a new ADR. */
		gate: z.literal("informational"),
		policyVersion: telemetryIdentifierSchema,
		catalogVersion: telemetryIdentifierSchema.nullable(),
		correlator: telemetryPseudonymSchema.nullable(),
		recordedAt: z.string().datetime(),
	})
	.strict();

export type EvaluationResultRecord = z.infer<
	typeof evaluationResultRecordSchema
>;

/**
 * Deterministic row key for BigQuery `insertId`, so retrying a run does not
 * duplicate rows. A colliding key makes the store drop a distinct row, so the
 * key is the full natural key: the route is part of it because the golden set
 * reuses a fixture ID across routes, and the evaluator so two evaluators
 * emitting the same metric never collapse into one row.
 */
export function evaluationRecordInsertId(
	record: Pick<
		EvaluationResultRecord,
		"runId" | "fixtureId" | "route" | "metric" | "evaluator"
	>,
): string {
	return [
		record.runId,
		record.fixtureId,
		record.route,
		record.metric,
		record.evaluator,
	].join(":");
}
