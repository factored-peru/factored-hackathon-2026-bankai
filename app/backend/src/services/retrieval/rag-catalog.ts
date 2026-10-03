import type { SessionContext } from "../../domain/session.js";
import { StructuredQueryPlanCatalog } from "../data/structured-query-plan-catalog.js";

export type RagKind = "structured" | "knowledge_graph";

export type RagCatalogEntry = Readonly<{
	id: string;
	version: string;
	allowedRoles: readonly string[];
}>;

export type RagCatalog = Readonly<{
	kind: RagKind;
	version: string;
	entries: readonly RagCatalogEntry[];
}>;

export type RagCatalogLoadResult =
	| Readonly<{ status: "ready"; catalog: RagCatalog }>
	| Readonly<{ status: "unavailable"; reasonCode: string }>;

/**
 * Port for a closed, versioned retrieval catalog. Catalog contents never come
 * from the browser, prompt, or model output.
 */
export abstract class BaseRagCatalogRepository {
	abstract readonly kind: RagKind;
	abstract load(input: {
		session: SessionContext;
		traceId: string;
	}): Promise<RagCatalogLoadResult>;
}

/**
 * Exposes only safe catalog metadata to the specialized Jev. The SQL remains
 * inside StructuredQueryPlanCatalog and cannot be returned to a model.
 */
export class StructuredRagCatalogRepository extends BaseRagCatalogRepository {
	readonly kind = "structured" as const;

	constructor(
		private readonly plans = new StructuredQueryPlanCatalog("v1", []),
	) {
		super();
	}

	async load(input: {
		session: SessionContext;
		traceId: string;
	}): Promise<RagCatalogLoadResult> {
		const entries = this.plans.entriesFor(input.session);
		if (entries.length === 0) {
			return {
				status: "unavailable",
				reasonCode: "structured_catalog_unavailable",
			};
		}
		return {
			status: "ready",
			catalog: { kind: this.kind, version: this.plans.version, entries },
		};
	}
}

/** TODO: load the signed KG operation catalog before calling the KG JEV. */
export class KnowledgeGraphRagCatalogRepository extends BaseRagCatalogRepository {
	readonly kind = "knowledge_graph" as const;

	async load(): Promise<RagCatalogLoadResult> {
		return { status: "unavailable", reasonCode: "kg_catalog_unavailable" };
	}
}
