import {
	type EvaluationResultRecord,
	evaluationRecordInsertId,
	evaluationResultRecordSchema,
} from "../../domain/observability/evaluation-result-record.js";
import type {
	EvaluationResultSink,
	EvaluationSinkFailure,
	EvaluationSinkResult,
} from "../../services/ports/evaluation-result-sink.js";

/** One streaming-insert row: `insertId` lets BigQuery drop immediate retries. */
export type EvaluationInsertRow = Readonly<{
	insertId: string;
	json: Readonly<Record<string, unknown>>;
}>;

/** The slice of the BigQuery table this adapter needs, so tests need no network. */
export interface BigQueryInsertClientLike {
	insertRows(rows: readonly EvaluationInsertRow[]): Promise<void>;
}

/** BigQuery recommends at most 500 rows per streaming request. */
const DEFAULT_BATCH_SIZE = 500;

/** Maps a validated record to its snake_case table row. */
export function evaluationRecordToRow(
	record: EvaluationResultRecord,
): EvaluationInsertRow {
	return {
		insertId: evaluationRecordInsertId(record),
		json: {
			schema_version: record.schemaVersion,
			run_id: record.runId,
			matrix_version: record.matrixVersion,
			fixture_id: record.fixtureId,
			route: record.route,
			metric: record.metric,
			score: record.score,
			passed: record.passed,
			label: record.label,
			reason_code: record.reasonCode,
			evaluator: record.evaluator,
			evaluator_version: record.evaluatorVersion,
			mode: record.mode,
			gate: record.gate,
			policy_version: record.policyVersion,
			catalog_version: record.catalogVersion,
			correlator: record.correlator,
			recorded_at: record.recordedAt,
		},
	};
}

/**
 * Persists sanitized evaluation results with streaming inserts. Every record is
 * validated again against the strict schema before anything is sent, and one
 * invalid record writes nothing. Failures map to closed codes: the provider's
 * message could echo row values, so it is never kept.
 */
export class BigQueryEvaluationResultSink implements EvaluationResultSink {
	constructor(
		private readonly client: BigQueryInsertClientLike,
		private readonly batchSize = DEFAULT_BATCH_SIZE,
	) {}

	async write(
		records: readonly EvaluationResultRecord[],
	): Promise<EvaluationSinkResult> {
		const attempted = records.length;
		const rows: EvaluationInsertRow[] = [];
		for (const record of records) {
			const parsed = evaluationResultRecordSchema.safeParse(record);
			if (!parsed.success) {
				return fail("sink_invalid_record", attempted, 0);
			}
			rows.push(evaluationRecordToRow(parsed.data));
		}
		let written = 0;
		for (let start = 0; start < rows.length; start += this.batchSize) {
			const batch = rows.slice(start, start + this.batchSize);
			try {
				await this.client.insertRows(batch);
				written += batch.length;
			} catch (error) {
				return fail(classifyFailure(error), attempted, written);
			}
		}
		return { status: "ok", written };
	}
}

function fail(
	reason: EvaluationSinkFailure,
	attempted: number,
	written: number,
): EvaluationSinkResult {
	return { status: "failed", reason, attempted, written };
}

function firstReason(errors: unknown): string | null {
	if (!Array.isArray(errors)) return null;
	const reason = (errors[0] as { reason?: unknown } | undefined)?.reason;
	return typeof reason === "string" ? reason : null;
}

/**
 * Maps a provider error to a closed code from its HTTP status and Google
 * `reason`. The message is read only to tell the billing and credential cases
 * apart (Google reports both under a generic status); it is never returned.
 */
function classifyFailure(error: unknown): EvaluationSinkFailure {
	if (!(error instanceof Error)) return "sink_unavailable";
	if (error.name === "PartialFailureError") return "sink_rejected_rows";
	const { code, errors } = error as Error & {
		code?: unknown;
		errors?: unknown;
	};
	const reason = firstReason(errors);
	if (
		reason === "billingNotEnabled" ||
		/free tier|billing (has not|is not) been enabled/i.test(error.message)
	) {
		return "sink_billing_required";
	}
	if (
		code === 401 ||
		/default credentials|invalid_grant|reauth/i.test(error.message)
	) {
		return "sink_auth_failed";
	}
	if (code === 404 || reason === "notFound") return "sink_not_found";
	if (code === 403 || reason === "accessDenied" || reason === "forbidden") {
		return "sink_permission_denied";
	}
	return "sink_unavailable";
}

type RawInsertTable = {
	insert(
		rows: readonly EvaluationInsertRow[],
		options: {
			raw: true;
			skipInvalidRows: false;
			ignoreUnknownValues: false;
		},
	): Promise<unknown>;
};

/**
 * Adapts a BigQuery table. `skipInvalidRows` and `ignoreUnknownValues` are off
 * on purpose: a row the table rejects must fail loudly, not be dropped or
 * silently stripped of fields.
 */
export function wrapBigQueryTable(
	table: RawInsertTable,
): BigQueryInsertClientLike {
	return {
		async insertRows(rows) {
			await table.insert(rows, {
				raw: true,
				skipInvalidRows: false,
				ignoreUnknownValues: false,
			});
		},
	};
}
