import type {
	QueryCatalog,
	QueryCatalogEntry,
} from "../../domain/data/query-catalog.js";
import type { SessionContext } from "../../domain/session.js";
import { loadQueryCatalog } from "../data/query-catalog-loader.js";
import type { SqlValidationOptions } from "../data/query-sql-validator.js";
import type { QueryCatalogSource } from "../ports/retrieval.js";
import {
	BaseRagCatalogRepository,
	type RagCatalogLoadResult,
} from "./rag-catalog.js";

function allowedFor(
	session: SessionContext,
	entry: QueryCatalogEntry,
): boolean {
	return entry.allowedRoles.some((role) => session.roles.includes(role));
}

/**
 * Closed Structured RAG catalog backed by a versioned document. The document is
 * validated once; an invalid or unreadable catalog is never served, and each
 * session only sees the entries its roles allow.
 */
export class StructuredRagCatalogRepository extends BaseRagCatalogRepository {
	readonly kind = "structured" as const;

	private cached: QueryCatalog | null = null;

	constructor(
		private readonly source: QueryCatalogSource,
		private readonly options: SqlValidationOptions,
	) {
		super();
	}

	async load(input: {
		session: SessionContext;
		traceId: string;
	}): Promise<RagCatalogLoadResult> {
		const catalog = await this.validated();
		if (catalog === null) {
			return {
				status: "unavailable",
				reasonCode: "structured_catalog_unavailable",
			};
		}

		const entries = catalog.entries
			.filter((entry) => allowedFor(input.session, entry))
			.map((entry) => ({
				id: entry.queryId,
				version: entry.version,
				allowedRoles: entry.allowedRoles,
				description: entry.description,
			}));
		return entries.length === 0
			? { status: "unavailable", reasonCode: "structured_catalog_no_entries" }
			: {
					status: "ready",
					catalog: { kind: this.kind, version: catalog.version, entries },
				};
	}

	/**
	 * Full entry (SQL included) for the executor. It stays inside the backend and
	 * is returned only when the session's role is allowed to run it.
	 */
	async resolve(input: {
		session: SessionContext;
		queryId: string;
		version: string;
	}): Promise<QueryCatalogEntry | null> {
		const catalog = await this.validated();
		const entry = catalog?.entries.find(
			(candidate) =>
				candidate.queryId === input.queryId &&
				candidate.version === input.version,
		);
		return entry !== undefined && allowedFor(input.session, entry)
			? entry
			: null;
	}

	private async validated(): Promise<QueryCatalog | null> {
		if (this.cached !== null) {
			return this.cached;
		}
		try {
			const result = loadQueryCatalog(await this.source.read(), this.options);
			if (result.status !== "ready") {
				return null;
			}
			this.cached = result.catalog;
			return this.cached;
		} catch {
			return null;
		}
	}
}
