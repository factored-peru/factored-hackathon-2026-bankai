import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { decode } from "@msgpack/msgpack";
import { z } from "zod";
import type { Env } from "../../config/env.js";
import {
	KgAdminError,
	KgAdminService,
	type KgCurrentPointer,
	type KgPublicationAdminStore,
	type KgVersionSummary,
} from "../../services/admin/kg-admin-service.js";

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

const backendRoot = resolve(
	dirname(fileURLToPath(import.meta.url)),
	"../../..",
);

function sha256(bytes: Uint8Array): string {
	return createHash("sha256").update(bytes).digest("hex");
}

function utf8(bytes: Uint8Array): string {
	return new TextDecoder().decode(bytes);
}

/**
 * Local filesystem admin store for demo published packages under
 * `{root}/{tenant}/{run_id}/*` + `current.json`.
 */
export class LocalKgPublicationAdminStore implements KgPublicationAdminStore {
	constructor(
		private readonly root: string,
		readonly tenantId: string,
	) {}

	async readCurrent(): Promise<KgCurrentPointer | null> {
		try {
			const raw = await this.readJson(`${this.tenantId}/current.json`);
			return currentSchema.parse(raw);
		} catch {
			return null;
		}
	}

	async listVersions(): Promise<ReadonlyArray<KgVersionSummary>> {
		const current = await this.readCurrent();
		const tenantRoot = this.resolvePath(this.tenantId);
		let entries: string[] = [];
		try {
			entries = await readdir(tenantRoot);
		} catch {
			return [];
		}
		const versions: KgVersionSummary[] = [];
		for (const entry of entries.sort()) {
			if (entry === "current.json" || entry.startsWith(".")) continue;
			if (!runIdSchema.safeParse(entry).success) continue;
			const manifest = await this.readManifest(entry);
			versions.push({
				run_id: entry,
				catalog_version: manifest?.catalog_version ?? null,
				graph_sha256: manifest?.graph_sha256 ?? null,
				is_current: current?.run_id === entry,
			});
		}
		return versions;
	}

	async readManifest(runId: string): Promise<{
		run_id: string;
		graph_sha256: string;
		catalog_version: string | null;
		node_count: number | null;
		edge_count: number | null;
	} | null> {
		if (!runIdSchema.safeParse(runId).success) return null;
		try {
			const manifestBytes = await this.readObject(
				`${this.tenantId}/${runId}/graph-manifest.json`,
			);
			const catalogBytes = await this.readObject(
				`${this.tenantId}/${runId}/kg-operation-catalog.json`,
			);
			const graphBytes = await this.readObject(
				`${this.tenantId}/${runId}/graph-v1.msgpack`,
			);
			const manifest = JSON.parse(utf8(manifestBytes)) as {
				run_id?: string;
				graph_sha256?: string;
			};
			const catalog = JSON.parse(utf8(catalogBytes)) as {
				version?: string;
			};
			if (
				typeof manifest.run_id !== "string" ||
				typeof manifest.graph_sha256 !== "string" ||
				manifest.graph_sha256 !== sha256(graphBytes)
			) {
				return null;
			}
			const graph = decode(graphBytes) as {
				nodes?: unknown[];
				edges?: unknown[];
			};
			return {
				run_id: manifest.run_id,
				graph_sha256: manifest.graph_sha256,
				catalog_version:
					typeof catalog.version === "string" ? catalog.version : null,
				node_count: Array.isArray(graph.nodes) ? graph.nodes.length : null,
				edge_count: Array.isArray(graph.edges) ? graph.edges.length : null,
			};
		} catch {
			return null;
		}
	}

	async promote(runId: string): Promise<KgCurrentPointer> {
		const packageInfo = await this.readManifest(runId);
		if (!packageInfo) throw new KgAdminError("not_found", "kg_version_missing");
		const graphBytes = await this.readObject(
			`${this.tenantId}/${runId}/graph-v1.msgpack`,
		);
		const manifestBytes = await this.readObject(
			`${this.tenantId}/${runId}/graph-manifest.json`,
		);
		const catalogBytes = await this.readObject(
			`${this.tenantId}/${runId}/kg-operation-catalog.json`,
		);
		const manifest = JSON.parse(utf8(manifestBytes)) as {
			source?: {
				kdd_run_id?: string;
				case_catalog_version?: string | null;
			};
		};
		const catalog = JSON.parse(utf8(catalogBytes)) as {
			version?: string;
		};
		if (typeof catalog.version !== "string") {
			throw new KgAdminError("invalid", "kg_catalog_version_missing");
		}
		const pointer: KgCurrentPointer = {
			schema_version: "bankai-local-kg-publication-v1",
			tenant_id: this.tenantId,
			run_id: runId,
			catalog_version: catalog.version,
			artifact_dir: runId,
			files: {
				"graph-v1.msgpack": sha256(graphBytes),
				"graph-manifest.json": sha256(manifestBytes),
				"kg-operation-catalog.json": sha256(catalogBytes),
			},
			provenance: {
				kdd_run_id:
					typeof manifest.source?.kdd_run_id === "string"
						? manifest.source.kdd_run_id
						: "unknown",
				case_catalog_version:
					typeof manifest.source?.case_catalog_version === "string"
						? manifest.source.case_catalog_version
						: null,
			},
		};
		await writeFile(
			this.resolvePath(`${this.tenantId}/current.json`),
			`${JSON.stringify(pointer, null, 2)}\n`,
			"utf8",
		);
		return pointer;
	}

	private async readJson(relative: string): Promise<unknown> {
		const bytes = await this.readObject(relative);
		return JSON.parse(utf8(bytes));
	}

	private async readObject(relative: string): Promise<Uint8Array> {
		return readFile(this.resolvePath(relative));
	}

	private resolvePath(relative: string): string {
		const resolvedRoot = resolve(this.root);
		const candidate = resolve(resolvedRoot, relative);
		if (
			candidate !== resolvedRoot &&
			!candidate.startsWith(`${resolvedRoot}${sep}`)
		) {
			throw new KgAdminError("invalid", "kg_artifact_path_escape");
		}
		return candidate;
	}
}

export function createKgAdminService(
	settings: Pick<
		Env,
		| "KG_RAG_LOCAL_ENABLED"
		| "KG_RAG_LOCAL_ARTIFACT_DIR"
		| "KG_RAG_LOCAL_TENANT_ID"
	>,
): KgAdminService | null {
	if (!settings.KG_RAG_LOCAL_ENABLED) return null;
	const root = isAbsolute(settings.KG_RAG_LOCAL_ARTIFACT_DIR)
		? settings.KG_RAG_LOCAL_ARTIFACT_DIR
		: resolve(backendRoot, settings.KG_RAG_LOCAL_ARTIFACT_DIR);
	return new KgAdminService(
		new LocalKgPublicationAdminStore(root, settings.KG_RAG_LOCAL_TENANT_ID),
	);
}
