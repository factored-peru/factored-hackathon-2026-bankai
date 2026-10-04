import { createHash } from "node:crypto";
import { decode } from "@msgpack/msgpack";
import { z } from "zod";
import type { SessionContext } from "../../domain/session.js";
import {
	BaseRagCatalogRepository,
	type RagCatalog,
	type RagCatalogLoadResult,
} from "./rag-catalog.js";

const runIdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{2,127}$/);
const checksumSchema = z.string().regex(/^[a-f0-9]{64}$/);
const currentSchema = z
	.object({
		schema_version: z.literal("bankai-local-kg-publication-v1"),
		tenant_id: z.string().min(1),
		run_id: runIdSchema,
		catalog_version: z.string().min(1),
		artifact_dir: runIdSchema,
		files: z
			.object({
				"graph-v1.msgpack": checksumSchema,
				"graph-manifest.json": checksumSchema,
				"kg-operation-catalog.json": checksumSchema,
			})
			.strict(),
		provenance: z
			.object({
				kdd_run_id: z.string().min(1),
				case_catalog_version: z.string().min(1).nullable(),
			})
			.strict(),
	})
	.strict();

const graphManifestSchema = z
	.object({
		schema_version: z.literal("bankai-kdd-graph-v1"),
		run_id: runIdSchema,
		graph_file: z.literal("graph-v1.msgpack"),
		graph_sha256: checksumSchema,
		source: z
			.object({
				kdd_run_id: z.string().min(1),
				case_catalog_version: z.string().min(1).optional(),
			})
			.passthrough(),
	})
	.passthrough();

const operationSchema = z
	.object({
		id: z.string().min(1),
		version: z.string().min(1),
		description: z.string().min(1),
		allowedRoles: z.array(z.string().min(1)).min(1),
		parameters: z
			.array(
				z
					.object({
						name: z.string().min(1),
						type: z.literal("string"),
						allowedValues: z.array(z.string().min(1)).min(1),
					})
					.strict(),
			)
			.min(1),
	})
	.strict();

const operationCatalogSchema = z
	.object({
		schema_version: z.literal("bankai-kg-operation-catalog-v1"),
		kind: z.literal("knowledge_graph"),
		version: z.string().min(1),
		graph_schema_version: z.literal("bankai-kdd-graph-v1"),
		operations: z.array(operationSchema).min(1),
	})
	.strict();

const graphNodeSchema = z
	.object({
		id: z.string().min(1),
		kind: z.string().min(1),
		attributes: z.record(z.string(), z.unknown()),
	})
	.strict();
const graphEdgeSchema = z
	.object({
		source: z.string().min(1),
		target: z.string().min(1),
		relation: z.string().min(1),
		attributes: z.record(z.string(), z.unknown()),
	})
	.strict();
const graphSchema = z
	.object({
		format: z.literal("bankai-kdd-graph"),
		schema_version: z.literal("bankai-kdd-graph-v1"),
		source: z.record(z.string(), z.unknown()),
		nodes: z.array(graphNodeSchema),
		edges: z.array(graphEdgeSchema),
	})
	.strict();

export type KnowledgeGraphSnapshot = Readonly<{
	catalog: RagCatalog;
	graph: z.infer<typeof graphSchema>;
	graphSha256: string;
	runId: string;
}>;

export interface KnowledgeGraphArtifactResolver {
	resolve(input: {
		session: SessionContext;
		catalog: RagCatalog;
	}): KnowledgeGraphSnapshot | null;
}

/**
 * Development adapter for the same immutable-pointer protocol that production
 * will read from GCS. It never follows paths supplied by a catalog or model.
 */
export abstract class ImmutableKnowledgeGraphArtifactRepository
	extends BaseRagCatalogRepository
	implements KnowledgeGraphArtifactResolver
{
	readonly kind = "knowledge_graph" as const;
	private readonly snapshots = new Map<string, KnowledgeGraphSnapshot>();

	constructor(private readonly allowedTenantId: string) {
		super();
	}

	/** Reads a relative, validated artifact object. Implementations own transport. */
	protected abstract readObject(name: string): Promise<Uint8Array>;

	async load(input: {
		session: SessionContext;
		traceId: string;
	}): Promise<RagCatalogLoadResult> {
		if (input.session.tenantId !== this.allowedTenantId) {
			return { status: "unavailable", reasonCode: "kg_tenant_not_authorized" };
		}
		try {
			const snapshot = await this.readSnapshot(input.session);
			this.snapshots.set(snapshot.catalog.version, snapshot);
			return { status: "ready", catalog: snapshot.catalog };
		} catch {
			return { status: "unavailable", reasonCode: "kg_catalog_unavailable" };
		}
	}

	resolve(input: {
		session: SessionContext;
		catalog: RagCatalog;
	}): KnowledgeGraphSnapshot | null {
		if (
			input.catalog.kind !== this.kind ||
			input.session.tenantId !== this.allowedTenantId
		) {
			return null;
		}
		return this.snapshots.get(input.catalog.version) ?? null;
	}

	private async readSnapshot(
		session: SessionContext,
	): Promise<KnowledgeGraphSnapshot> {
		const tenantId = session.tenantId;
		const tenantRoot = safeObjectName(tenantId);
		const current = currentSchema.parse(
			await this.readJson(`${tenantRoot}/current.json`),
		);
		if (
			current.tenant_id !== tenantId ||
			current.artifact_dir !== current.run_id
		) {
			throw new Error("kg_pointer_tenant_or_run_mismatch");
		}
		const artifactRoot = safeObjectName(tenantId, current.artifact_dir);
		const graphBytes = await this.readChecked(
			artifactRoot,
			"graph-v1.msgpack",
			current.files["graph-v1.msgpack"],
		);
		const manifestBytes = await this.readChecked(
			artifactRoot,
			"graph-manifest.json",
			current.files["graph-manifest.json"],
		);
		const catalogBytes = await this.readChecked(
			artifactRoot,
			"kg-operation-catalog.json",
			current.files["kg-operation-catalog.json"],
		);
		const manifest = graphManifestSchema.parse(
			JSON.parse(manifestBytes.toString("utf8")),
		);
		const operations = operationCatalogSchema.parse(
			JSON.parse(catalogBytes.toString("utf8")),
		);
		if (
			manifest.run_id !== current.run_id ||
			manifest.graph_sha256 !== sha256(graphBytes) ||
			operations.version !== current.catalog_version ||
			manifest.source.kdd_run_id !== current.provenance.kdd_run_id ||
			(manifest.source.case_catalog_version ?? null) !==
				current.provenance.case_catalog_version
		) {
			throw new Error("kg_artifact_provenance_mismatch");
		}
		const graph = graphSchema.parse(decode(graphBytes));
		const entries = operations.operations
			.filter((operation) =>
				operation.allowedRoles.some((role) => session.roles.includes(role)),
			)
			.map((operation) => ({
				id: operation.id,
				version: operation.version,
				allowedRoles: operation.allowedRoles,
				description: operation.description,
				parameters: operation.parameters.map((parameter) => ({
					name: parameter.name,
					type: parameter.type,
					allowedValues: parameter.allowedValues,
				})),
			}));
		// Role filtering happens in load, after the validated snapshot is built.
		return {
			catalog: { kind: this.kind, version: operations.version, entries },
			graph,
			graphSha256: manifest.graph_sha256,
			runId: current.run_id,
		};
	}

	private async readJson(path: string): Promise<unknown> {
		return JSON.parse(
			Buffer.from(await this.readObject(path)).toString("utf8"),
		);
	}

	private async readChecked(
		root: string,
		filename: string,
		expected: string,
	): Promise<Buffer> {
		const safeFilename = safeObjectName(filename);
		const content = Buffer.from(
			await this.readObject(`${root}/${safeFilename}`),
		);
		if (sha256(content) !== expected)
			throw new Error("kg_artifact_checksum_mismatch");
		return content;
	}
}

function safeObjectName(...segments: string[]): string {
	if (
		segments.length === 0 ||
		segments.some(
			(segment) =>
				segment.length === 0 ||
				segment.includes("/") ||
				segment.includes("\\") ||
				segment === "." ||
				segment === "..",
		)
	) {
		throw new Error("kg_artifact_path_escape");
	}
	return segments.join("/");
}

function sha256(content: Uint8Array): string {
	return createHash("sha256").update(content).digest("hex");
}
