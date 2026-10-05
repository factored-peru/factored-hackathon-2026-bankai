import {
	type EvaluationResultRecord,
	evaluationRecordInsertId,
} from "../../domain/observability/evaluation-result-record.js";
import type {
	EvaluationResultSink,
	EvaluationSinkFailure,
	EvaluationSinkResult,
} from "../../services/ports/evaluation-result-sink.js";

/** Volatile double for tests; keeps one row per insert ID, like a deduping store. */
export class InMemoryEvaluationResultSink implements EvaluationResultSink {
	private readonly rows = new Map<string, EvaluationResultRecord>();

	constructor(private readonly failWith?: EvaluationSinkFailure) {}

	get records(): readonly EvaluationResultRecord[] {
		return [...this.rows.values()];
	}

	async write(
		records: readonly EvaluationResultRecord[],
	): Promise<EvaluationSinkResult> {
		if (this.failWith !== undefined) {
			return {
				status: "failed",
				reason: this.failWith,
				attempted: records.length,
				written: 0,
			};
		}
		for (const record of records) {
			this.rows.set(evaluationRecordInsertId(record), record);
		}
		return { status: "ok", written: records.length };
	}
}
