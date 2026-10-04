import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { Env } from "../../config/env.js";
import type { SqlValidationOptions } from "../../services/data/query-sql-validator.js";
import type { CustomerIdentityResolver } from "../../services/ports/customer-identity.js";
import type { QueryCatalogSource } from "../../services/ports/retrieval.js";
import { StructuredRagCatalogRepository } from "../../services/retrieval/structured-catalog-repository.js";
import {
	type StructuredQuerySelector,
	StructuredRag,
} from "../../services/retrieval/structured-rag.js";
import { FileQueryCatalogSource } from "../catalog/file-query-catalog-source.js";
import {
	type BigQueryClientLike,
	BigQueryQueryExecutor,
	wrapBigQuery,
} from "./bigquery-query-executor.js";

export type StructuredRagSettings = Pick<
	Env,
	| "BIGQUERY_ENABLED"
	| "BIGQUERY_DATASET"
	| "BIGQUERY_JOB_TIMEOUT_MS"
	| "STRUCTURED_CATALOG_PATH"
	| "GOOGLE_CLOUD_PROJECT"
	| "GOOGLE_CLOUD_LOCATION"
>;

export type StructuredQueryRuntime = Readonly<{
	source: QueryCatalogSource;
	options: SqlValidationOptions;
	/** Serves the validated catalog; also the entry resolver for StructuredRag. */
	catalog: StructuredRagCatalogRepository;
	executor: BigQueryQueryExecutor;
}>;

const backendRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

/**
 * Maps configuration to the Structured RAG adapters. It fails closed when
 * BigQuery is disabled and opens no connection: the client authenticates with
 * Application Default Credentials only when the first job is created.
 */
export async function createStructuredQueryRuntime(
	settings: StructuredRagSettings,
	overrides: { client?: BigQueryClientLike } = {},
): Promise<StructuredQueryRuntime> {
	if (!settings.BIGQUERY_ENABLED) {
		throw new Error("structured_runtime_disabled");
	}

	const options = {
		project: settings.GOOGLE_CLOUD_PROJECT,
		dataset: settings.BIGQUERY_DATASET,
	};
	const client =
		overrides.client ??
		wrapBigQuery(
			new (await import("@google-cloud/bigquery")).BigQuery({
				projectId: settings.GOOGLE_CLOUD_PROJECT,
				location: settings.GOOGLE_CLOUD_LOCATION,
			}),
		);
	const path = isAbsolute(settings.STRUCTURED_CATALOG_PATH)
		? settings.STRUCTURED_CATALOG_PATH
		: resolve(backendRoot, settings.STRUCTURED_CATALOG_PATH);
	const source = new FileQueryCatalogSource(path);

	return {
		source,
		options,
		catalog: new StructuredRagCatalogRepository(source, options),
		executor: new BigQueryQueryExecutor({
			client,
			location: settings.GOOGLE_CLOUD_LOCATION,
			jobTimeoutMs: settings.BIGQUERY_JOB_TIMEOUT_MS,
		}),
	};
}

/**
 * Builds Structured RAG with its catalog repository, the pair the StateGraph
 * needs. The selector (specialized judge) and the identity resolver are
 * injected: neither belongs to BigQuery configuration.
 */
export async function createStructuredRag(
	settings: StructuredRagSettings,
	dependencies: {
		selector: StructuredQuerySelector;
		identity: CustomerIdentityResolver;
	},
	overrides: { client?: BigQueryClientLike } = {},
): Promise<
	Readonly<{ rag: StructuredRag; catalog: StructuredRagCatalogRepository }>
> {
	const runtime = await createStructuredQueryRuntime(settings, overrides);
	return {
		catalog: runtime.catalog,
		rag: new StructuredRag({
			selector: dependencies.selector,
			entries: runtime.catalog,
			identity: dependencies.identity,
			executor: runtime.executor,
		}),
	};
}
