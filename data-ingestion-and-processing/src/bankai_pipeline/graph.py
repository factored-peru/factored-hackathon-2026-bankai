"""Compile a deterministic, PII-safe graph from corroborated KDD rules only."""

from __future__ import annotations

import hashlib
import json
import math
import re
import tempfile
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import msgpack

from bankai_pipeline.kdd import RUN_ID, PopulationDefinition, population_definitions
from bankai_pipeline.kg_cases import CASE_CATALOG_VERSION, KgCaseDefinition, case_definitions


GRAPH_SCHEMA_VERSION = "bankai-kdd-graph-v1"
GRAPH_FILENAME = "graph-v1.msgpack"
MANIFEST_FILENAME = "graph-manifest.json"
ITEM_VALUE = re.compile(r"^[A-Z0-9_.-]{1,64}$")
FEATURE_NAME = re.compile(r"^[a-z][a-z0-9_]{0,127}$")


class GraphInputError(ValueError):
    """Raised when a KDD artifact cannot safely become graph provenance."""


@dataclass(frozen=True)
class KddArtifacts:
    root: Path
    manifest: Mapping[str, object]
    manifest_sha256: str
    results: Mapping[str, Mapping[str, object]]
    result_sha256: Mapping[str, str]


@dataclass(frozen=True)
class ConsensusRule:
    population: str
    antecedents: tuple[str, ...]
    consequent: str
    support: float
    confidence: float
    lift: float


@dataclass(frozen=True)
class GraphNode:
    identifier: str
    kind: str
    attributes: Mapping[str, object]

    def payload(self) -> dict[str, object]:
        return {"id": self.identifier, "kind": self.kind, "attributes": dict(self.attributes)}


@dataclass(frozen=True)
class GraphEdge:
    source: str
    target: str
    relation: str
    attributes: Mapping[str, object]

    def payload(self) -> dict[str, object]:
        return {
            "source": self.source,
            "target": self.target,
            "relation": self.relation,
            "attributes": dict(self.attributes),
        }


@dataclass(frozen=True)
class CompiledGraph:
    source: Mapping[str, object]
    nodes: tuple[GraphNode, ...]
    edges: tuple[GraphEdge, ...]

    def payload(self) -> dict[str, object]:
        return {
            "format": "bankai-kdd-graph",
            "schema_version": GRAPH_SCHEMA_VERSION,
            "source": dict(self.source),
            "nodes": [node.payload() for node in self.nodes],
            "edges": [edge.payload() for edge in self.edges],
        }


class KddArtifactReader:
    """Load only the fixed, local artifacts produced by ``run_kdd``."""

    def load(self, artifact_dir: Path) -> KddArtifacts:
        root = artifact_dir.resolve()
        if not root.is_dir():
            raise GraphInputError("kdd artifact directory is missing")
        manifest_path = root / "kdd_manifest.json"
        manifest = _read_json_object(manifest_path)
        _require_string(manifest, "run_id")
        if manifest.get("kdd_version") != "v1":
            raise GraphInputError("unsupported KDD artifact version")
        populations = manifest.get("populations")
        expected = [definition.name for definition in population_definitions()]
        if populations != expected:
            raise GraphInputError("KDD populations do not match the approved graph contract")
        results: dict[str, Mapping[str, object]] = {}
        result_sha256: dict[str, str] = {}
        for population in expected:
            result_path = root / f"{population}_kdd.json"
            results[population] = _read_json_object(result_path)
            result_sha256[population] = _sha256_file(result_path)
        return KddArtifacts(
            root=root,
            manifest=manifest,
            manifest_sha256=_sha256_file(manifest_path),
            results=results,
            result_sha256=result_sha256,
        )


class KddConsensusValidator:
    """Validate only rules independently emitted by Apriori, FP-Growth and Eclat."""

    def collect(self, artifacts: KddArtifacts) -> tuple[ConsensusRule, ...]:
        definitions = {definition.name: definition for definition in population_definitions()}
        rules: list[ConsensusRule] = []
        for population, definition in definitions.items():
            result = artifacts.results[population]
            catalog = _catalog_for(result, definition)
            rule_sets = result.get("rules")
            if not isinstance(rule_sets, Mapping):
                raise GraphInputError(f"{population} must contain rule sets")
            required = {"apriori", "fpgrowth", "eclat"}
            if not required <= set(rule_sets):
                raise GraphInputError(
                    f"{population} must contain Apriori, FP-Growth and Eclat rules"
                )
            indexed = {
                algorithm: _indexed_rules(rule_sets[algorithm], definition, catalog)
                for algorithm in sorted(required)
            }
            shared = set.intersection(*(set(index) for index in indexed.values()))
            for key in sorted(shared):
                metrics = [indexed[algorithm][key] for algorithm in sorted(required)]
                if not all(_same_metrics(metrics[0], other) for other in metrics[1:]):
                    raise GraphInputError(f"{population} consensus rule has divergent metrics")
                left = metrics[0]
                rules.append(
                    ConsensusRule(
                        population=population,
                        antecedents=key[0],
                        consequent=key[1],
                        support=_metric(left, "support"),
                        confidence=_metric(left, "confidence"),
                        lift=_metric(left, "lift"),
                    )
                )
        if not rules:
            raise GraphInputError("KDD artifact contains no corroborated rules")
        return tuple(sorted(rules, key=lambda rule: (rule.population, rule.antecedents, rule.consequent)))


class KddGraphCompiler:
    """Materialize provenance as a DAG without turning associations into facts."""

    def compile(self, artifacts: KddArtifacts, rules: Sequence[ConsensusRule]) -> CompiledGraph:
        nodes: dict[str, GraphNode] = {}
        edges: dict[tuple[str, str, str], GraphEdge] = {}
        definitions = {definition.name: definition for definition in population_definitions()}

        def add_node(identifier: str, kind: str, **attributes: object) -> None:
            node = GraphNode(identifier, kind, dict(sorted(attributes.items())))
            existing = nodes.get(identifier)
            if existing is not None and existing != node:
                raise GraphInputError(f"conflicting graph node: {identifier}")
            nodes[identifier] = node

        def add_edge(source: str, target: str, relation: str, **attributes: object) -> None:
            key = (source, target, relation)
            edge = GraphEdge(source, target, relation, dict(sorted(attributes.items())))
            existing = edges.get(key)
            if existing is not None and existing != edge:
                raise GraphInputError(f"conflicting graph edge: {key}")
            edges[key] = edge

        for population, definition in definitions.items():
            population_id = f"population:{population}"
            add_node(population_id, "population", name=population, target=definition.target_column)
            catalog = _catalog_for(artifacts.results[population], definition)
            for item in catalog:
                feature, value = _split_item(item)
                if feature == definition.target_column:
                    target_id = _target_id(population, item)
                    add_node(target_id, "target", population=population, feature=feature, value=value)
                    add_edge(population_id, target_id, "has_target")
                    continue
                feature_id = f"feature:{population}:{feature}"
                value_id = _value_id(population, item)
                add_node(feature_id, "feature", population=population, name=feature)
                add_node(value_id, "feature_value", population=population, feature=feature, value=value)
                add_edge(population_id, feature_id, "has_feature")
                add_edge(feature_id, value_id, "has_value")

        for rule in rules:
            rule_id = _rule_id(rule)
            target_id = _target_id(rule.population, rule.consequent)
            add_node(
                rule_id,
                "rule",
                population=rule.population,
                antecedent_count=len(rule.antecedents),
                algorithm_consensus="apriori_fpgrowth_eclat",
            )
            for item in rule.antecedents:
                add_edge(_value_id(rule.population, item), rule_id, "antecedent")
            add_edge(
                rule_id,
                target_id,
                "predicts",
                algorithms=["apriori", "fpgrowth", "eclat"],
                support=rule.support,
                confidence=rule.confidence,
                lift=rule.lift,
            )

        ordered_nodes = tuple(nodes[key] for key in sorted(nodes))
        ordered_edges = tuple(edges[key] for key in sorted(edges))
        _assert_dag(ordered_nodes, ordered_edges)
        return CompiledGraph(
            source={
                "kdd_run_id": _require_string(artifacts.manifest, "run_id"),
                "kdd_version": _require_string(artifacts.manifest, "kdd_version"),
                "kdd_manifest_sha256": artifacts.manifest_sha256,
                "kdd_population_sha256": dict(sorted(artifacts.result_sha256.items())),
                "populations": [definition.name for definition in population_definitions()],
                "rule_count": len(rules),
            },
            nodes=ordered_nodes,
            edges=ordered_edges,
        )


class KgCaseGraphAugmenter:
    """Attach only approved aggregate cases and experiment provenance.

    A case is not a customer case or a dispute record.  It is the analytical
    definition C1--C8 used to explain the limits of the graph artifact.
    """

    def augment(
        self,
        graph: CompiledGraph,
        supervised_suite_dir: Path | None = None,
        case_artifact_dirs: Mapping[str, Path] | None = None,
    ) -> CompiledGraph:
        nodes = {node.identifier: node for node in graph.nodes}
        edges = {(edge.source, edge.target, edge.relation): edge for edge in graph.edges}

        def add_node(identifier: str, kind: str, **attributes: object) -> None:
            node = GraphNode(identifier, kind, dict(sorted(attributes.items())))
            existing = nodes.get(identifier)
            if existing is not None and existing != node:
                raise GraphInputError(f"conflicting graph node: {identifier}")
            nodes[identifier] = node

        def add_edge(source: str, target: str, relation: str, **attributes: object) -> None:
            key = (source, target, relation)
            edge = GraphEdge(source, target, relation, dict(sorted(attributes.items())))
            existing = edges.get(key)
            if existing is not None and existing != edge:
                raise GraphInputError(f"conflicting graph edge: {key}")
            edges[key] = edge

        definitions = case_definitions()
        for definition in definitions:
            case_id = f"case:{definition.identifier}"
            add_node(
                case_id,
                "case",
                case_id=definition.identifier,
                target=definition.target,
                predictors=list(definition.predictors),
                status=definition.status,
                limitation=definition.limitation,
            )
            if definition.population is not None:
                population_id = f"population:{definition.population}"
                if population_id not in nodes:
                    add_node(
                        population_id,
                        "population",
                        name=definition.population,
                        target=definition.target,
                    )
                add_edge(case_id, population_id, "applies_to")

        suite_source: dict[str, object] = {"included": False}
        if supervised_suite_dir is not None or case_artifact_dirs is not None:
            if supervised_suite_dir is None or case_artifact_dirs is None:
                raise GraphInputError("supervised suite and all case artifact directories are required together")
            self._add_model_runs(nodes, edges, definitions, supervised_suite_dir, case_artifact_dirs)
            suite_source = {
                "included": True,
                "manifest_sha256": _sha256_file(
                    supervised_suite_dir / "supervised-suite-manifest.json"
                ),
            }

        ordered_nodes = tuple(nodes[key] for key in sorted(nodes))
        ordered_edges = tuple(edges[key] for key in sorted(edges))
        _assert_dag(ordered_nodes, ordered_edges)
        source = dict(graph.source)
        source["case_catalog_version"] = CASE_CATALOG_VERSION
        source["supervised_suite"] = suite_source
        return CompiledGraph(source=source, nodes=ordered_nodes, edges=ordered_edges)

    def _add_model_runs(
        self,
        nodes: dict[str, GraphNode],
        edges: dict[tuple[str, str, str], GraphEdge],
        definitions: tuple[KgCaseDefinition, ...],
        suite_dir: Path,
        case_dirs: Mapping[str, Path],
    ) -> None:
        suite_path = suite_dir / "supervised-suite-manifest.json"
        suite = _read_json_object(suite_path)
        if suite.get("schema_version") != "bankai-supervised-suite-v1":
            raise GraphInputError("unsupported supervised suite version")
        suite_cases = suite.get("cases")
        if not isinstance(suite_cases, Mapping):
            raise GraphInputError("supervised suite cases are invalid")
        expected = {definition.identifier for definition in definitions if definition.identifier <= "C5"}
        if set(case_dirs) != expected or set(suite_cases) != expected:
            raise GraphInputError("supervised suite must contain exactly C1 through C5")
        manifest_names = {case: f"{case.lower()}-manifest.json" for case in expected}
        definition_by_id = {definition.identifier: definition for definition in definitions}
        for case in sorted(expected):
            path = case_dirs[case] / manifest_names[case]
            manifest = _read_json_object(path)
            suite_case = suite_cases.get(case)
            if not isinstance(suite_case, Mapping):
                raise GraphInputError(f"supervised suite case is invalid: {case}")
            if suite_case.get("sha256") != _sha256_file(path):
                raise GraphInputError(f"supervised suite checksum mismatch: {case}")
            if manifest.get("case") != case or manifest.get("publication") != "not_requested":
                raise GraphInputError(f"invalid supervised case manifest: {case}")
            run_id = _require_string(manifest, "run_id")
            schema_version = _require_string(manifest, "schema_version")
            # C2 reports quantile evaluation rather than a classifier metric;
            # both shapes are aggregate and are normalized into ModelRun.
            metrics = manifest.get("metrics", manifest.get("evaluation"))
            if not isinstance(metrics, Mapping):
                raise GraphInputError(f"supervised case metrics are invalid: {case}")
            model_id = f"model_run:{case}:{run_id}"
            model = GraphNode(
                model_id,
                "model_run",
                {
                    "case_id": case,
                    "run_id": run_id,
                    "schema_version": schema_version,
                    "manifest_sha256": _sha256_file(path),
                    "target": manifest.get("target", definition_by_id[case].target),
                    "metrics": _safe_metrics(metrics),
                    "status": "exploratory_not_promoted",
                },
            )
            if model_id in nodes and nodes[model_id] != model:
                raise GraphInputError(f"conflicting graph node: {model_id}")
            nodes[model_id] = model
            edge = GraphEdge(f"case:{case}", model_id, "evaluated_by", {})
            key = (edge.source, edge.target, edge.relation)
            if key in edges and edges[key] != edge:
                raise GraphInputError(f"conflicting graph edge: {key}")
            edges[key] = edge


class GraphArtifactWriter:
    """Write deterministic local artifacts; publication is intentionally separate."""

    def write(self, output_dir: Path, run_id: str, graph: CompiledGraph) -> dict[str, object]:
        if not RUN_ID.fullmatch(run_id):
            raise GraphInputError("run_id must be opaque and match the allowed format")
        destination = output_dir / run_id
        destination.mkdir(parents=True, exist_ok=True)
        graph_bytes = msgpack.packb(graph.payload(), use_bin_type=True, strict_types=True)
        graph_path = destination / GRAPH_FILENAME
        _atomic_write_bytes(graph_path, graph_bytes)
        manifest = {
            "schema_version": GRAPH_SCHEMA_VERSION,
            "run_id": run_id,
            "graph_file": GRAPH_FILENAME,
            "graph_sha256": hashlib.sha256(graph_bytes).hexdigest(),
            "source": dict(graph.source),
            "node_count": len(graph.nodes),
            "edge_count": len(graph.edges),
            "publication": "not_requested",
        }
        _atomic_write_json(destination / MANIFEST_FILENAME, manifest)
        return manifest


def compile_graph(
    kdd_artifact_dir: Path,
    output_dir: Path,
    run_id: str,
    supervised_suite_dir: Path | None = None,
    case_artifact_dirs: Mapping[str, Path] | None = None,
) -> dict[str, object]:
    artifacts = KddArtifactReader().load(kdd_artifact_dir)
    rules = KddConsensusValidator().collect(artifacts)
    graph = KddGraphCompiler().compile(artifacts, rules)
    graph = KgCaseGraphAugmenter().augment(graph, supervised_suite_dir, case_artifact_dirs)
    return GraphArtifactWriter().write(output_dir, run_id, graph)


def graph_dry_run_plan(
    kdd_artifact_dir: Path,
    output_dir: Path,
    run_id: str,
    supervised_suite_dir: Path | None = None,
    case_artifact_dirs: Mapping[str, Path] | None = None,
) -> dict[str, object]:
    if not RUN_ID.fullmatch(run_id):
        raise GraphInputError("run_id must be opaque and match the allowed format")
    artifacts = KddArtifactReader().load(kdd_artifact_dir)
    rules = KddConsensusValidator().collect(artifacts)
    graph = KddGraphCompiler().compile(artifacts, rules)
    graph = KgCaseGraphAugmenter().augment(graph, supervised_suite_dir, case_artifact_dirs)
    return {
        "schema_version": GRAPH_SCHEMA_VERSION,
        "run_id": run_id,
        "kdd_run_id": graph.source["kdd_run_id"],
        "consensus_rule_count": len(rules),
        "node_count": len(graph.nodes),
        "edge_count": len(graph.edges),
        "output": str(output_dir / run_id / GRAPH_FILENAME),
        "publication": "not_requested",
    }


def _safe_metrics(value: object) -> object:
    """Keep numeric aggregate metrics and their labels, never lineage or rows."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, list):
        return [_safe_metrics(item) for item in value]
    if isinstance(value, Mapping):
        blocked = {"job_id", "query_hash", "table", "lineage", "rows", "records"}
        if any(not isinstance(key, str) or key in blocked for key in value):
            raise GraphInputError("supervised metrics contain a prohibited field")
        return {key: _safe_metrics(item) for key, item in sorted(value.items())}
    raise GraphInputError("supervised metrics contain an unsupported value")


def _catalog_for(result: Mapping[str, object], definition: PopulationDefinition) -> tuple[str, ...]:
    raw_catalog = result.get("feature_catalog")
    if not isinstance(raw_catalog, Mapping) or raw_catalog.get("target") != definition.target_column:
        raise GraphInputError(f"{definition.name} has an invalid feature catalog")
    raw_features = raw_catalog.get("features")
    if not isinstance(raw_features, list) or not all(isinstance(item, str) for item in raw_features):
        raise GraphInputError(f"{definition.name} feature catalog must be a string list")
    if len(raw_features) != len(set(raw_features)):
        raise GraphInputError(f"{definition.name} feature catalog contains duplicates")
    allowed_features = _allowed_features(definition)
    catalog = tuple(sorted(raw_features))
    for item in catalog:
        feature, _ = _split_item(item)
        if feature not in allowed_features:
            raise GraphInputError(f"{definition.name} catalog contains a disallowed feature")
    if not any(item.startswith(f"{definition.target_column}=") for item in catalog):
        raise GraphInputError(f"{definition.name} catalog has no target values")
    return catalog


def _indexed_rules(
    raw_rules: object, definition: PopulationDefinition, catalog: Sequence[str]
) -> dict[tuple[tuple[str, ...], str], Mapping[str, object]]:
    if not isinstance(raw_rules, list):
        raise GraphInputError(f"{definition.name} rules must be a list")
    catalog_set = set(catalog)
    indexed: dict[tuple[tuple[str, ...], str], Mapping[str, object]] = {}
    target_prefix = f"{definition.target_column}="
    for raw_rule in raw_rules:
        if not isinstance(raw_rule, Mapping):
            raise GraphInputError(f"{definition.name} contains a malformed rule")
        antecedents = raw_rule.get("antecedents")
        consequent = raw_rule.get("consequent")
        if not isinstance(antecedents, list) or not antecedents or not all(isinstance(item, str) for item in antecedents):
            raise GraphInputError(f"{definition.name} rule antecedents are invalid")
        if not isinstance(consequent, str) or not consequent.startswith(target_prefix):
            raise GraphInputError(f"{definition.name} rule consequent is not its target")
        ordered = tuple(sorted(antecedents))
        if len(ordered) != len(set(ordered)) or tuple(antecedents) != ordered:
            raise GraphInputError(f"{definition.name} rule antecedents are not canonical")
        if any(item.startswith(target_prefix) for item in ordered):
            raise GraphInputError(f"{definition.name} target appears in rule antecedents")
        if not set((*ordered, consequent)).issubset(catalog_set):
            raise GraphInputError(f"{definition.name} rule is outside its feature catalog")
        for metric in ("support", "confidence", "lift"):
            _metric(raw_rule, metric)
        support, confidence, lift = (_metric(raw_rule, name) for name in ("support", "confidence", "lift"))
        if not 0 < support <= 1 or not 0 < confidence <= 1 or lift <= 0:
            raise GraphInputError(f"{definition.name} rule metrics are outside their domain")
        key = (ordered, consequent)
        if key in indexed:
            raise GraphInputError(f"{definition.name} contains duplicate rules")
        indexed[key] = raw_rule
    return indexed


def _allowed_features(definition: PopulationDefinition) -> set[str]:
    allowed = {
        definition.target_column,
        *definition.categorical_columns,
        *definition.boolean_columns,
        *definition.numeric_columns,
    }
    for numeric in definition.numeric_columns:
        allowed.add(f"{numeric}_bucket")
        allowed.add(f"{numeric}_sign")
    return allowed


def _same_metrics(left: Mapping[str, object], right: Mapping[str, object]) -> bool:
    return all(math.isclose(_metric(left, name), _metric(right, name), rel_tol=0, abs_tol=1e-6) for name in ("support", "confidence", "lift"))


def _metric(rule: Mapping[str, object], name: str) -> float:
    value = rule.get(name)
    if not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(float(value)):
        raise GraphInputError(f"rule {name} is invalid")
    return float(value)


def _split_item(item: str) -> tuple[str, str]:
    feature, separator, value = item.partition("=")
    if separator != "=" or not FEATURE_NAME.fullmatch(feature) or not ITEM_VALUE.fullmatch(value):
        raise GraphInputError("feature item is not sanitized")
    return feature, value


def _value_id(population: str, item: str) -> str:
    return f"value:{population}:{item}"


def _target_id(population: str, item: str) -> str:
    return f"target:{population}:{item}"


def _rule_id(rule: ConsensusRule) -> str:
    canonical = json.dumps(
        {
            "population": rule.population,
            "antecedents": rule.antecedents,
            "consequent": rule.consequent,
            "support": rule.support,
            "confidence": rule.confidence,
            "lift": rule.lift,
        },
        separators=(",", ":"),
        sort_keys=True,
    )
    return f"rule:{rule.population}:{hashlib.sha256(canonical.encode('utf-8')).hexdigest()}"


def _assert_dag(nodes: Sequence[GraphNode], edges: Sequence[GraphEdge]) -> None:
    import networkx as nx

    graph = nx.DiGraph()
    graph.add_nodes_from(node.identifier for node in nodes)
    graph.add_edges_from((edge.source, edge.target) for edge in edges)
    if not nx.is_directed_acyclic_graph(graph):
        raise GraphInputError("compiled graph is not acyclic")


def _read_json_object(path: Path) -> Mapping[str, object]:
    try:
        value = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise GraphInputError(f"cannot read KDD artifact: {path.name}") from error
    if not isinstance(value, Mapping):
        raise GraphInputError(f"KDD artifact is not an object: {path.name}")
    return value


def _require_string(source: Mapping[str, object], key: str) -> str:
    value = source.get(key)
    if not isinstance(value, str) or not value:
        raise GraphInputError(f"missing string field: {key}")
    return value


def _sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def _atomic_write_bytes(path: Path, content: bytes) -> None:
    with tempfile.NamedTemporaryFile("wb", dir=path.parent, delete=False) as temporary:
        temporary.write(content)
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def _atomic_write_json(path: Path, payload: Mapping[str, object]) -> None:
    content = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8") + b"\n"
    _atomic_write_bytes(path, content)
