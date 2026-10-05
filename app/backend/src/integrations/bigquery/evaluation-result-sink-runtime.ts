import type { Env } from "../../config/env.js";
import type { EvaluationResultSink } from "../../services/ports/evaluation-result-sink.js";
import {
	BigQueryEvaluationResultSink,
	type BigQueryInsertClientLike,
	wrapBigQueryTable,
} from "./bigquery-evaluation-result-sink.js";

export type EvaluationSinkSettings = Pick<
	Env,
	| "BIGQUERY_ENABLED"
	| "BIGQUERY_EVAL_DATASET"
	| "BIGQUERY_EVAL_TABLE"
	| "GOOGLE_CLOUD_PROJECT"
	| "GOOGLE_CLOUD_LOCATION"
>;

/**
 * Maps configuration to the evaluation result sink. An empty
 * `BIGQUERY_EVAL_DATASET` means persistence is off and returns `null`, so
 * nothing is created. It opens no connection: the client authenticates with
 * Application Default Credentials only on the first insert.
 */
export async function createEvaluationResultSink(
	settings: EvaluationSinkSettings,
	overrides: { client?: BigQueryInsertClientLike } = {},
): Promise<EvaluationResultSink | null> {
	if (settings.BIGQUERY_EVAL_DATASET.length === 0) {
		return null;
	}
	if (!settings.BIGQUERY_ENABLED) {
		throw new Error("evaluation_sink_requires_bigquery");
	}
	const client =
		overrides.client ??
		wrapBigQueryTable(
			new (await import("@google-cloud/bigquery")).BigQuery({
				projectId: settings.GOOGLE_CLOUD_PROJECT,
				location: settings.GOOGLE_CLOUD_LOCATION,
			})
				.dataset(settings.BIGQUERY_EVAL_DATASET)
				.table(settings.BIGQUERY_EVAL_TABLE),
		);
	return new BigQueryEvaluationResultSink(client);
}
