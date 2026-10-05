import { Storage } from "@google-cloud/storage";
import type { Env } from "../../config/env.js";
import { ImmutableKnowledgeGraphArtifactRepository } from "../../services/retrieval/knowledge-graph-artifacts.js";
import { KnowledgeGraphRag } from "../../services/retrieval/knowledge-graph-rag.js";
import { createLocalKnowledgeGraphRuntime } from "./local-knowledge-graph-runtime.js";

export type KnowledgeGraphRuntime = Readonly<{
	catalog: ImmutableKnowledgeGraphArtifactRepository;
	rag: KnowledgeGraphRag;
}>;

export type GcsObjectHandle = {
	download(): Promise<[Buffer | Uint8Array]>;
};

export type GcsBucketLike = {
	file(name: string): GcsObjectHandle;
};

export type GcsKnowledgeGraphSettings = Pick<
	Env,
	| "GCS_ENABLED"
	| "GCS_GRAPH_BUCKET"
	| "GCS_GRAPH_ARTIFACT_PREFIX"
	| "GCS_GRAPH_TENANT_ID"
>;

export type KnowledgeGraphRuntimeSettings = GcsKnowledgeGraphSettings &
	Pick<
		Env,
		| "KG_RAG_LOCAL_ENABLED"
		| "KG_RAG_LOCAL_ARTIFACT_DIR"
		| "KG_RAG_LOCAL_TENANT_ID"
	>;

/**
 * Production transport for the immutable KG publication contract. It shares
 * all pointer, tenant, catalog, checksum and MsgPack validation with the local
 * reader; it does not make GCS availability a fallback to local files.
 */
export class GcsKnowledgeGraphArtifactRepository extends ImmutableKnowledgeGraphArtifactRepository {
	private readonly prefix: string;

	constructor(
		private readonly bucket: GcsBucketLike,
		allowedTenantId: string,
		artifactPrefix = "",
	) {
		super(allowedTenantId);
		this.prefix = normalizeArtifactPrefix(artifactPrefix);
	}

	protected async readObject(name: string): Promise<Uint8Array> {
		const objectName = `${this.prefix}${name}`;
		const [content] = await this.bucket.file(objectName).download();
		return content instanceof Uint8Array ? content : new Uint8Array(content);
	}
}

/**
 * Maps configuration to the GCS KG adapters. Fails closed when GCS is disabled
 * or the bucket is unset; authenticates with Application Default Credentials.
 */
export function createGcsKnowledgeGraphRuntime(
	settings: GcsKnowledgeGraphSettings,
	overrides: { bucket?: GcsBucketLike } = {},
): KnowledgeGraphRuntime {
	if (!settings.GCS_ENABLED) {
		throw new Error("kg_gcs_runtime_disabled");
	}
	if (settings.GCS_GRAPH_BUCKET.trim().length === 0) {
		throw new Error("kg_gcs_bucket_missing");
	}
	if (settings.GCS_GRAPH_TENANT_ID.trim().length === 0) {
		throw new Error("kg_gcs_tenant_missing");
	}
	const bucket: GcsBucketLike =
		overrides.bucket ?? new Storage().bucket(settings.GCS_GRAPH_BUCKET.trim());
	const catalog = new GcsKnowledgeGraphArtifactRepository(
		bucket,
		settings.GCS_GRAPH_TENANT_ID.trim(),
		settings.GCS_GRAPH_ARTIFACT_PREFIX,
	);
	return { catalog, rag: new KnowledgeGraphRag(catalog) };
}

/**
 * Selects local (dev) or GCS (deploy) KG runtime. Returns null when neither
 * adapter is configured so baseline chat can start without a published graph.
 */
export function createKnowledgeGraphRuntime(
	settings: KnowledgeGraphRuntimeSettings,
	overrides: { bucket?: GcsBucketLike } = {},
): KnowledgeGraphRuntime | null {
	if (settings.KG_RAG_LOCAL_ENABLED) {
		return createLocalKnowledgeGraphRuntime(settings);
	}
	if (settings.GCS_GRAPH_BUCKET.trim().length > 0 && settings.GCS_ENABLED) {
		return createGcsKnowledgeGraphRuntime(settings, overrides);
	}
	return null;
}

export function normalizeArtifactPrefix(prefix: string): string {
	const cleaned = prefix.trim().replace(/^\/+|\/+$/g, "");
	return cleaned.length === 0 ? "" : `${cleaned}/`;
}
