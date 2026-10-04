import type { ModelEvidence } from "../../domain/retrieval/contracts.js";
import {
	type EvidenceDTO,
	evidenceDtoSchema,
} from "../../domain/retrieval/evidence.js";
import type { SessionContext } from "../../domain/session.js";
import { stableHash } from "../control-plane/stable-hash.js";
import { BaseRag, type RagExecutionResult } from "./base-rag.js";
import type {
	KnowledgeGraphArtifactResolver,
	KnowledgeGraphSnapshot,
} from "./knowledge-graph-artifacts.js";
import {
	type KnowledgeGraphSelection,
	knowledgeGraphSelectionSchema,
} from "./knowledge-graph-selection.js";
import type { RagCatalog, RagCatalogEntry } from "./rag-catalog.js";

export interface KnowledgeGraphRagExecutor {
	executeSelection(input: {
		session: SessionContext;
		catalog: RagCatalog;
		selection: KnowledgeGraphSelection;
		traceId: string;
	}): Promise<RagExecutionResult>;
}

type Scalar = string | number | boolean | null;
type Row = Record<string, Scalar>;

/** Closed, artifact-backed KG retrieval; it never accepts free graph queries. */
export class KnowledgeGraphRag
	extends BaseRag
	implements KnowledgeGraphRagExecutor
{
	readonly kind = "knowledge_graph" as const;
	private readonly now: () => Date;

	constructor(
		private readonly artifacts: KnowledgeGraphArtifactResolver,
		now: () => Date = () => new Date(),
	) {
		super();
		this.now = now;
	}

	async execute(): Promise<RagExecutionResult> {
		return { status: "failed", reasonCode: "kg_selection_required" };
	}

	async executeSelection(input: {
		session: SessionContext;
		catalog: RagCatalog;
		selection: KnowledgeGraphSelection;
		traceId: string;
	}): Promise<RagExecutionResult> {
		if (input.catalog.kind !== this.kind) return failed("kg_catalog_mismatch");
		const selection = knowledgeGraphSelectionSchema.safeParse(input.selection);
		if (!selection.success || selection.data.decision !== "select") {
			return failed("kg_selection_invalid");
		}
		const selected = selection.data as Extract<
			KnowledgeGraphSelection,
			{ decision: "select" }
		>;
		const entry = input.catalog.entries.find(
			(candidate) =>
				candidate.id === selected.operationId &&
				candidate.version === selected.version,
		);
		if (entry === undefined || !isRoleAllowed(input.session, entry)) {
			return failed("kg_operation_not_authorized");
		}
		const parameters = validateParameters(entry, selected.parameters);
		if (parameters === null) return failed("kg_parameters_invalid");
		const snapshot = this.artifacts.resolve({
			session: input.session,
			catalog: input.catalog,
		});
		if (snapshot === null) return failed("kg_artifact_unavailable");
		const result = executeOperation(snapshot, entry.id, parameters);
		if (result === null) return failed("kg_operation_no_result");
		const evidence = buildEvidence({
			operation: entry,
			catalogVersion: input.catalog.version,
			filters: parameters,
			rows: result.rows,
			relations: result.relations,
			retrievedAt: this.now(),
		});
		return evidence === null
			? failed("kg_evidence_invalid")
			: { status: "ready", evidence: [toModelEvidence(evidence)] };
	}
}

function failed(reasonCode: string): RagExecutionResult {
	return { status: "failed", reasonCode };
}

function isRoleAllowed(
	session: SessionContext,
	entry: RagCatalogEntry,
): boolean {
	return entry.allowedRoles.some((role) => session.roles.includes(role));
}

function validateParameters(
	entry: RagCatalogEntry,
	provided: Record<string, unknown>,
): Record<string, string> | null {
	const declared = entry.parameters ?? [];
	if (Object.keys(provided).length !== declared.length) return null;
	const values: Record<string, string> = {};
	for (const parameter of declared) {
		const value = provided[parameter.name];
		if (
			typeof value !== "string" ||
			parameter.type !== "string" ||
			!parameter.allowedValues?.includes(value)
		)
			return null;
		values[parameter.name] = value;
	}
	return values;
}

function executeOperation(
	snapshot: KnowledgeGraphSnapshot,
	operationId: string,
	parameters: Record<string, string>,
): { rows: Row[]; relations: EvidenceDTO["relations"] } | null {
	const nodes = new Map(snapshot.graph.nodes.map((node) => [node.id, node]));
	const edges = snapshot.graph.edges;
	if (operationId === "kg.case.summary") {
		const node = nodes.get(`case:${parameters.case_id}`);
		if (node?.kind !== "case") return null;
		const attributes = node.attributes;
		const modelRuns = edges
			.filter(
				(edge) => edge.source === node.id && edge.relation === "evaluated_by",
			)
			.map((edge) => nodes.get(edge.target))
			.filter(
				(candidate): candidate is NonNullable<typeof candidate> =>
					candidate !== undefined,
			)
			.map(
				(model) =>
					`${model.attributes.run_id ?? "unknown"}:${model.attributes.status ?? "unknown"}`,
			)
			.join(",");
		return {
			rows: [
				{
					case_id: scalar(attributes.case_id),
					status: scalar(attributes.status),
					target: scalar(attributes.target),
					predictors: Array.isArray(attributes.predictors)
						? attributes.predictors
								.filter((item): item is string => typeof item === "string")
								.join(",")
						: "",
					limitation: scalar(attributes.limitation),
					model_runs: modelRuns,
				},
			],
			relations: [{ column: "case_id", references: "kg.case" }],
		};
	}
	if (operationId === "kg.population.summary") {
		const node = [...nodes.values()].find(
			(candidate) =>
				candidate.kind === "population" &&
				candidate.attributes.name === parameters.population,
		);
		if (node === undefined) return null;
		return {
			rows: [
				{
					population: parameters.population ?? "",
					target: scalar(node.attributes.target ?? null),
					feature_count: edges.filter(
						(edge) =>
							edge.source === node.id && edge.relation === "has_feature",
					).length,
					target_count: edges.filter(
						(edge) => edge.source === node.id && edge.relation === "has_target",
					).length,
				},
			],
			relations: [{ column: "population", references: "kg.population" }],
		};
	}
	if (
		operationId === "kg.rules.by-target" ||
		operationId === "kg.rules.by-feature-value"
	) {
		const rows: Row[] = [];
		for (const edge of edges) {
			if (edge.relation !== "predicts") continue;
			const rule = nodes.get(edge.source);
			const target = nodes.get(edge.target);
			if (
				rule?.kind !== "rule" ||
				target?.kind !== "target" ||
				rule.attributes.population !== parameters.population
			)
				continue;
			const targetValue = `${target.attributes.feature}=${target.attributes.value}`;
			const antecedents = edges
				.filter(
					(candidate) =>
						candidate.target === rule.id && candidate.relation === "antecedent",
				)
				.map((candidate) => nodes.get(candidate.source))
				.filter(
					(candidate): candidate is NonNullable<typeof candidate> =>
						candidate !== undefined,
				)
				.map((value) => `${value.attributes.feature}=${value.attributes.value}`)
				.sort();
			if (parameters.target !== undefined && targetValue !== parameters.target)
				continue;
			if (
				parameters.item !== undefined &&
				!antecedents.includes(parameters.item)
			)
				continue;
			rows.push({
				antecedents: antecedents.join(" ∧ "),
				target: targetValue,
				support: scalar(edge.attributes.support),
				confidence: scalar(edge.attributes.confidence),
				lift: scalar(edge.attributes.lift),
				algorithms: Array.isArray(edge.attributes.algorithms)
					? edge.attributes.algorithms.join(",")
					: "",
			});
		}
		return rows.length === 0
			? null
			: {
					rows,
					relations: [
						{ column: "antecedents", references: "kg.feature_value" },
						{ column: "target", references: "kg.target" },
					],
				};
	}
	return null;
}

function scalar(value: unknown): Scalar {
	return typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean" ||
		value === null
		? value
		: "";
}

function buildEvidence(input: {
	operation: RagCatalogEntry;
	catalogVersion: string;
	filters: Record<string, string>;
	rows: Row[];
	relations: EvidenceDTO["relations"];
	retrievedAt: Date;
}): EvidenceDTO | null {
	const columns = Object.keys(input.rows[0] ?? {}).map((name) => ({
		name,
		type: "STRING",
		classification: "internal" as const,
	}));
	const parsed = evidenceDtoSchema.safeParse({
		source: {
			kind: "knowledge_graph",
			queryId: input.operation.id,
			queryVersion: input.operation.version,
			catalogVersion: input.catalogVersion,
			jobId: null,
		},
		scope: "tenant",
		filters: input.filters,
		columns,
		rows: input.rows,
		relations: input.relations,
		metrics: {
			rowCount: input.rows.length,
			truncated: false,
			bytesProcessed: null,
			durationMs: null,
		},
		retrievedAt: input.retrievedAt.toISOString(),
	});
	return parsed.success ? parsed.data : null;
}

function toModelEvidence(evidence: EvidenceDTO): ModelEvidence {
	const content = JSON.stringify({
		notice:
			"Exploratory aggregate association only; not causal, individual diagnosis, authorization, or automation.",
		operation: `${evidence.source.queryId}:${evidence.source.queryVersion}`,
		filters: evidence.filters,
		rows: evidence.rows,
	});
	return {
		content,
		documentRef: `${evidence.source.queryId}:${evidence.source.queryVersion}`,
		sourceType: "knowledge_graph",
		classification: "internal",
		contentHash: stableHash(content),
	};
}
