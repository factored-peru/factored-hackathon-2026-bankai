import type { SessionContext } from "../../domain/session.js";

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

/** TODO: connect to the authorized BigQuery QueryPlan catalog. */
export class StructuredRagCatalogRepository extends BaseRagCatalogRepository {
	readonly kind = "structured" as const;

	async load(): Promise<RagCatalogLoadResult> {
		return {
			status: "unavailable",
			reasonCode: "structured_catalog_unavailable",
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
