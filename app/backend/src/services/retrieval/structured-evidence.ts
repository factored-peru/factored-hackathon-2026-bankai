import type { DataClassification } from "../../domain/control/contracts.js";
import type { QueryCatalogEntry } from "../../domain/data/query-catalog.js";
import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import {
	type EvidenceDTO,
	evidenceDtoSchema,
} from "../../domain/retrieval/evidence.js";
import { stableHash } from "../control-plane/stable-hash.js";
import type {
	QueryParameterValues,
	StructuredQueryResult,
} from "../ports/structured-query.js";

const CLASSIFICATION_ORDER: readonly DataClassification[] = [
	"public",
	"internal",
	"personal",
	"financial",
	"secret",
];

/**
 * Builds the auditable evidence of one catalog query. Returns `null` when the
 * result does not satisfy the contract, so the caller fails closed. The scope
 * is always `self`: every catalog entry is bound to the session's customer.
 */
export function buildEvidence(input: {
	entry: QueryCatalogEntry;
	catalogVersion: string;
	filters: QueryParameterValues;
	result: Extract<StructuredQueryResult, { status: "ready" }>;
	retrievedAt: Date;
}): EvidenceDTO | null {
	const { entry, result } = input;
	const parsed = evidenceDtoSchema.safeParse({
		source: {
			kind: "structured",
			queryId: entry.queryId,
			queryVersion: entry.version,
			catalogVersion: input.catalogVersion,
			jobId: result.jobId,
		},
		scope: "self",
		filters: input.filters,
		columns: entry.columns,
		rows: result.rows,
		relations: entry.relations,
		metrics: {
			rowCount: result.rows.length,
			truncated: false,
			bytesProcessed: result.bytesProcessed,
			durationMs: result.durationMs,
		},
		retrievedAt: input.retrievedAt.toISOString(),
	});
	return parsed.success ? parsed.data : null;
}

/**
 * Projection that crosses the model boundary: values and applied filters, with
 * no SQL, table, job or identity details. The classification is the most
 * sensitive one among the returned columns.
 */
export function toModelEvidence(evidence: EvidenceDTO): ModelEvidence {
	const content = JSON.stringify({
		query: `${evidence.source.queryId}:${evidence.source.queryVersion}`,
		filters: evidence.filters,
		columns: evidence.columns.map((column) => column.name),
		rows: evidence.rows,
	});
	const classification = evidence.columns.reduce<DataClassification>(
		(highest, column) =>
			CLASSIFICATION_ORDER.indexOf(column.classification) >
			CLASSIFICATION_ORDER.indexOf(highest)
				? column.classification
				: highest,
		"public",
	);
	return {
		content,
		documentRef: `${evidence.source.queryId}:${evidence.source.queryVersion}`,
		sourceType: "bigquery_structured",
		classification,
		contentHash: stableHash(content),
	};
}
