import type { Bucket } from "@google-cloud/storage";
import { ImmutableKnowledgeGraphArtifactRepository } from "../../services/retrieval/knowledge-graph-artifacts.js";

/**
 * Production transport for the immutable KG publication contract. It shares
 * all pointer, tenant, catalog, checksum and MsgPack validation with the local
 * reader; it does not make GCS availability a fallback to local files.
 */
export class GcsKnowledgeGraphArtifactRepository extends ImmutableKnowledgeGraphArtifactRepository {
	constructor(
		private readonly bucket: Pick<Bucket, "file">,
		allowedTenantId: string,
	) {
		super(allowedTenantId);
	}

	protected async readObject(name: string): Promise<Uint8Array> {
		const [content] = await this.bucket.file(name).download();
		return content;
	}
}
