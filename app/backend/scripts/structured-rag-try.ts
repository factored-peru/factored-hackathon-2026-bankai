import { resolve } from "node:path";
import { parseArgs } from "node:util";
import { loadEnv } from "../src/config/env.js";
import type { SessionContext } from "../src/domain/session.js";
import { createStructuredRag } from "../src/integrations/bigquery/structured-rag-runtime.js";
import { FileQueryCatalogSource } from "../src/integrations/catalog/file-query-catalog-source.js";
import { StaticCustomerIdentityResolver } from "../src/integrations/identity/static-customer-identity-resolver.js";
import { createStructuredSelector } from "../src/integrations/providers/structured-selector-runtime.js";
import type { StructuredQueryExecutor } from "../src/services/ports/structured-query.js";
import { StructuredRagCatalogRepository } from "../src/services/retrieval/structured-catalog-repository.js";
import {
	type StructuredQuerySelector,
	StructuredRag,
} from "../src/services/retrieval/structured-rag.js";

/**
 * Local trial of the real Structured RAG path: JEV chooses the catalog entry,
 * Vertex AI reads the parameters, the backend validates and binds them.
 *
 * By default NOTHING runs in BigQuery: it shows the selection and the bound
 * parameters. `--execute` runs the real query for `--customer`. The question is
 * sent to TypeSafe and Vertex AI, so use synthetic text only (ADR 0010).
 */
const { values } = parseArgs({
	options: {
		question: { type: "string" },
		customer: { type: "string" },
		role: { type: "string", default: "customer" },
		execute: { type: "boolean", default: false },
		"show-rows": { type: "boolean", default: false },
	},
});

const question = values.question?.trim();
if (!question) {
	console.error(
		'Usage: bun run structured:try -- --question "..." [--customer <id>] [--role customer] [--execute] [--show-rows]',
	);
	process.exit(2);
}

const settings = loadEnv();
if (values.execute && (!values.customer || !settings.BIGQUERY_ENABLED)) {
	console.error(
		"--execute needs --customer <id> and BIGQUERY_ENABLED=true. Nothing was sent.",
	);
	process.exit(2);
}

console.log(
	"NOTE: the question goes to TypeSafe (JEV) and Vertex AI. Use synthetic text only.",
);

const session: SessionContext = {
	sessionId: "local-try",
	userId: "local-user",
	tenantId: "local-tenant",
	scopes: [],
	roles: [values.role ?? "customer"],
	capabilities: [],
	sessionVersion: 1,
	createdAt: new Date().toISOString(),
	lastSeenAt: new Date().toISOString(),
	expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
	revokedAt: null,
};

const realSelector = await createStructuredSelector(settings).catch(
	(error: Error) => {
		console.error(
			`Selector not available (${error.message}). Enable JEV_ENABLED and VERTEX_AI_ENABLED with their settings.`,
		);
		return process.exit(2);
	},
);
let proposal: unknown;
const selector: StructuredQuerySelector = {
	select: async (input) => {
		proposal = await realSelector.select(input);
		return proposal;
	},
};
const identity = new StaticCustomerIdentityResolver(
	values.customer
		? [
				{
					tenantId: session.tenantId,
					userId: session.userId,
					customerId: values.customer,
				},
			]
		: [],
);

// Without --execute this stands in for BigQuery: it records the bound values.
const planned: { queryId: string; parameters: Record<string, unknown> }[] = [];
const noop: StructuredQueryExecutor = {
	execute: async ({ entry, parameters }) => {
		const { customer_id: _hidden, ...visible } = parameters;
		planned.push({
			queryId: `${entry.queryId}@${entry.version}`,
			parameters: visible,
		});
		return {
			status: "ready",
			rows: [],
			jobId: null,
			bytesProcessed: null,
			durationMs: 0,
		};
	},
};

let catalog: StructuredRagCatalogRepository;
let rag: StructuredRag;
if (values.execute) {
	const built = await createStructuredRag(settings, { selector, identity });
	catalog = built.catalog;
	rag = built.rag;
} else {
	catalog = new StructuredRagCatalogRepository(
		new FileQueryCatalogSource(
			resolve(import.meta.dir, "..", settings.STRUCTURED_CATALOG_PATH),
		),
		{
			project: settings.GOOGLE_CLOUD_PROJECT,
			dataset: settings.BIGQUERY_DATASET,
		},
	);
	rag = new StructuredRag({
		selector,
		entries: catalog,
		identity,
		executor: noop,
	});
}

const loaded = await catalog.load({ session, traceId: "local-try" });
if (loaded.status !== "ready") {
	console.error(`Catalog unavailable: ${loaded.reasonCode}`);
	process.exit(1);
}
console.log(
	`Catalog ${loaded.catalog.version}: ${loaded.catalog.entries.length} entries for role "${values.role}".`,
);

const result = await rag.execute({
	query: question,
	session,
	catalog: loaded.catalog,
	traceId: "local-try",
});

console.log(`Selector decision: ${JSON.stringify(proposal)}`);
if (result.status === "failed") {
	console.log(`Result: FAILED ${result.reasonCode}`);
	process.exit(1);
}

const [evidence] = result.evidence;
if (!values.execute) {
	console.log(
		`Result: OK (not executed). Would run ${JSON.stringify(planned[0])}`,
	);
	process.exit(0);
}
const content = JSON.parse(evidence?.content ?? "{}") as {
	columns: string[];
	rows: unknown[];
};
console.log(
	`Result: OK ${evidence?.documentRef} rows=${content.rows.length} columns=${content.columns.join(",")} classification=${evidence?.classification}`,
);
if (values["show-rows"]) {
	console.log(JSON.stringify(content.rows, null, 2));
}
