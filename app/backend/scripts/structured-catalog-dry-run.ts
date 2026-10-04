import { loadEnv } from "../src/config/env.js";
import { createStructuredQueryRuntime } from "../src/integrations/bigquery/structured-rag-runtime.js";
import { loadQueryCatalog } from "../src/services/data/query-catalog-loader.js";
import { checkDryRun } from "../src/services/data/query-dry-run-check.js";

/**
 * Validates every catalog entry against the real BigQuery tables with a dry
 * run: BigQuery plans the query and reports its schema and estimated bytes, so
 * no rows are read and nothing is billed. Output carries only ids, byte counts
 * and rule names, never SQL or data. Requires BIGQUERY_ENABLED=true and
 * Application Default Credentials.
 */
async function main(): Promise<number> {
	const settings = loadEnv();
	if (!settings.BIGQUERY_ENABLED) {
		console.error(
			"BIGQUERY_ENABLED is false: set it to true to run the catalog dry run.",
		);
		return 1;
	}

	const runtime = await createStructuredQueryRuntime(settings);
	let raw: unknown;
	try {
		raw = await runtime.source.read();
	} catch {
		console.error(
			`Cannot read the catalog at STRUCTURED_CATALOG_PATH (${settings.STRUCTURED_CATALOG_PATH}).`,
		);
		return 1;
	}

	const loaded = loadQueryCatalog(raw, runtime.options);
	if (loaded.status !== "ready") {
		console.error(`Catalog rejected: ${loaded.reasonCode}`);
		for (const issue of loaded.issues) {
			console.error(`  ${issue}`);
		}
		return 1;
	}

	let failures = 0;
	for (const entry of loaded.catalog.entries) {
		const label = `${entry.queryId}@${entry.version}`;
		const dryRun = await runtime.executor.dryRun({ entry });
		if (dryRun.status !== "ready") {
			failures++;
			console.log(`FAIL  ${label}  ${dryRun.reasonCode}`);
			continue;
		}
		const check = checkDryRun(entry, dryRun);
		if (!check.valid) {
			failures++;
			console.log(`FAIL  ${label}  ${check.rule}`);
			continue;
		}
		console.log(
			`OK    ${label}  estimated_bytes=${dryRun.bytesProcessed} cap=${entry.maximumBytesBilled}`,
		);
	}

	console.log(
		`${loaded.catalog.entries.length - failures} of ${loaded.catalog.entries.length} entries passed.`,
	);
	return failures === 0 ? 0 : 1;
}

process.exit(await main());
