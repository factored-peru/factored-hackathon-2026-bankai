/** Admin port for published KG pointer, versions, promote and rollback. */

export type KgCurrentPointer = Readonly<{
	schema_version: string;
	tenant_id: string;
	run_id: string;
	catalog_version: string;
	artifact_dir: string;
	files: Readonly<Record<string, string>>;
	provenance: Readonly<{
		kdd_run_id: string;
		case_catalog_version: string | null;
	}>;
}>;

export type KgVersionSummary = Readonly<{
	run_id: string;
	catalog_version: string | null;
	graph_sha256: string | null;
	is_current: boolean;
}>;

export type KgPackageDiff = Readonly<{
	from_run_id: string;
	to_run_id: string;
	from_catalog_version: string | null;
	to_catalog_version: string | null;
	from_graph_sha256: string | null;
	to_graph_sha256: string | null;
	identical: boolean;
	from_node_count: number | null;
	to_node_count: number | null;
	from_edge_count: number | null;
	to_edge_count: number | null;
}>;

export interface KgPublicationAdminStore {
	readonly tenantId: string;
	readCurrent(): Promise<KgCurrentPointer | null>;
	listVersions(): Promise<ReadonlyArray<KgVersionSummary>>;
	readManifest(runId: string): Promise<{
		run_id: string;
		graph_sha256: string;
		catalog_version: string | null;
		node_count: number | null;
		edge_count: number | null;
	} | null>;
	promote(runId: string): Promise<KgCurrentPointer>;
}

export class KgAdminError extends Error {
	constructor(
		readonly code:
			| "unavailable"
			| "not_found"
			| "conflict"
			| "forbidden"
			| "invalid",
		message: string,
	) {
		super(message);
		this.name = "KgAdminError";
	}
}

export class KgAdminService {
	constructor(private readonly store: KgPublicationAdminStore) {}

	async current(): Promise<KgCurrentPointer> {
		const pointer = await this.store.readCurrent();
		if (!pointer) throw new KgAdminError("not_found", "kg_current_missing");
		return pointer;
	}

	async versions(): Promise<ReadonlyArray<KgVersionSummary>> {
		return this.store.listVersions();
	}

	async diff(input: { from: string; to: string }): Promise<KgPackageDiff> {
		const fromPackage = await this.store.readManifest(input.from);
		const toPackage = await this.store.readManifest(input.to);
		if (!fromPackage || !toPackage) {
			throw new KgAdminError("not_found", "kg_version_missing");
		}
		return {
			from_run_id: fromPackage.run_id,
			to_run_id: toPackage.run_id,
			from_catalog_version: fromPackage.catalog_version,
			to_catalog_version: toPackage.catalog_version,
			from_graph_sha256: fromPackage.graph_sha256,
			to_graph_sha256: toPackage.graph_sha256,
			identical: fromPackage.graph_sha256 === toPackage.graph_sha256,
			from_node_count: fromPackage.node_count,
			to_node_count: toPackage.node_count,
			from_edge_count: fromPackage.edge_count,
			to_edge_count: toPackage.edge_count,
		};
	}

	async promote(runId: string): Promise<KgCurrentPointer> {
		return this.store.promote(runId);
	}

	async rollback(toRunId: string): Promise<KgCurrentPointer> {
		return this.store.promote(toRunId);
	}
}
