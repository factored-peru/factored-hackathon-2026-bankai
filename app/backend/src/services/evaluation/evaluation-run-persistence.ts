import { TelemetryAttributeError } from "../../domain/observability/telemetry-attributes.js";
import {
	type EvaluationRecordRun,
	evaluationResultRecords,
} from "../observability/telemetry-sanitizer.js";
import type {
	EvaluationResultSink,
	EvaluationSinkResult,
} from "../ports/evaluation-result-sink.js";
import type { EvaluationContext, EvaluationReport } from "./contracts.js";

export type EvaluatedFixture = Readonly<{
	context: EvaluationContext;
	report: EvaluationReport;
}>;

/**
 * Persists one evaluation run through the sink. Records are built by the
 * sanitizer, so a contract breach surfaces as `sink_invalid_record` and nothing
 * is written. It never throws: persisting badly does not change a result.
 */
export async function persistEvaluationRun(
	fixtures: readonly EvaluatedFixture[],
	options: Readonly<{ sink: EvaluationResultSink; run: EvaluationRecordRun }>,
): Promise<EvaluationSinkResult> {
	try {
		const records = fixtures.flatMap(({ context, report }) =>
			evaluationResultRecords(context, report, options.run),
		);
		return await options.sink.write(records);
	} catch (error) {
		if (error instanceof TelemetryAttributeError) {
			return {
				status: "failed",
				reason: "sink_invalid_record",
				attempted: fixtures.reduce(
					(total, { report }) => total + report.results.length,
					0,
				),
				written: 0,
			};
		}
		throw error;
	}
}
