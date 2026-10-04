import { readFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import type { Env } from "../../config/env.js";
import { ImmutableKnowledgeGraphArtifactRepository } from "../../services/retrieval/knowledge-graph-artifacts.js";
import { KnowledgeGraphRag } from "../../services/retrieval/knowledge-graph-rag.js";

const backendRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

/**
 * Creates the local development KG pair for a StateGraph composition root.
 * It is intentionally not wired into the demo/baseline conversation runtime.
 */
export function createLocalKnowledgeGraphRuntime(
	settings: Pick<
		Env,
		| "KG_RAG_LOCAL_ENABLED"
		| "KG_RAG_LOCAL_ARTIFACT_DIR"
		| "KG_RAG_LOCAL_TENANT_ID"
	>,
) {
	if (!settings.KG_RAG_LOCAL_ENABLED) {
		throw new Error("kg_local_runtime_disabled");
	}
	const root = isAbsolute(settings.KG_RAG_LOCAL_ARTIFACT_DIR)
		? settings.KG_RAG_LOCAL_ARTIFACT_DIR
		: resolve(backendRoot, settings.KG_RAG_LOCAL_ARTIFACT_DIR);
	const catalog = new LocalKnowledgeGraphArtifactRepository(
		root,
		settings.KG_RAG_LOCAL_TENANT_ID,
	);
	return { catalog, rag: new KnowledgeGraphRag(catalog) };
}

/** File transport for development only; validation stays in the shared base. */
export class LocalKnowledgeGraphArtifactRepository extends ImmutableKnowledgeGraphArtifactRepository {
	constructor(
		private readonly root: string,
		allowedTenantId: string,
	) {
		super(allowedTenantId);
	}

	protected readObject(name: string): Promise<Uint8Array> {
		const resolvedRoot = resolve(this.root);
		const candidate = resolve(resolvedRoot, name);
		if (!candidate.startsWith(`${resolvedRoot}${sep}`)) {
			throw new Error("kg_artifact_path_escape");
		}
		return readFile(candidate);
	}
}
