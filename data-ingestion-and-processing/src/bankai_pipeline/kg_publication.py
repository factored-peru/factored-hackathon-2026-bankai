"""Local-only publication contract for a validated KG artifact.

This module intentionally has no cloud SDK dependency.  The production GCS
publisher remains a separate ADR 0020 concern; this adapter emulates its
immutable-version plus ``current.json`` protocol for backend development.
"""

from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
from collections.abc import Mapping
from pathlib import Path

import msgpack

from bankai_pipeline.graph import GRAPH_FILENAME, GRAPH_SCHEMA_VERSION, MANIFEST_FILENAME, GraphInputError
from bankai_pipeline.kdd import RUN_ID


CATALOG_FILENAME = "kg-operation-catalog.json"
CURRENT_FILENAME = "current.json"
PUBLICATION_SCHEMA_VERSION = "bankai-local-kg-publication-v1"
CATALOG_SCHEMA_VERSION = "bankai-kg-operation-catalog-v1"
DEMO_TENANT_ID = "demo-bankai"


def publish_local_graph(source_dir: Path, local_target: Path, tenant_id: str = DEMO_TENANT_ID) -> dict[str, object]:
    """Atomically publish a local immutable graph package and its pointer."""

    if tenant_id != DEMO_TENANT_ID:
        raise GraphInputError("local KG publication only supports demo-bankai")
    source = source_dir.resolve()
    manifest_path = source / MANIFEST_FILENAME
    graph_path = source / GRAPH_FILENAME
    manifest = _read_json(manifest_path)
    if manifest.get("schema_version") != GRAPH_SCHEMA_VERSION:
        raise GraphInputError("graph manifest schema is unsupported")
    run_id = _required_string(manifest, "run_id")
    if not RUN_ID.fullmatch(run_id):
        raise GraphInputError("graph manifest run_id is invalid")
    graph_bytes = _read_bytes(graph_path)
    if manifest.get("graph_file") != GRAPH_FILENAME or manifest.get("graph_sha256") != _sha256(graph_bytes):
        raise GraphInputError("graph manifest checksum mismatch")
    graph = _decode_graph(graph_bytes)
    catalog = _build_catalog(graph, manifest)

    tenant_root = local_target.resolve() / tenant_id
    version_dir = tenant_root / run_id
    tenant_root.mkdir(parents=True, exist_ok=True)
    if version_dir.exists():
        existing = version_dir / MANIFEST_FILENAME
        if not existing.is_file() or _sha256(_read_bytes(existing)) != _sha256(_read_bytes(manifest_path)):
            raise GraphInputError("local graph version already exists with different content")
    else:
        staging = Path(tempfile.mkdtemp(prefix=f".{run_id}-", dir=tenant_root))
        try:
            shutil.copy2(graph_path, staging / GRAPH_FILENAME)
            shutil.copy2(manifest_path, staging / MANIFEST_FILENAME)
            _atomic_json(staging / CATALOG_FILENAME, catalog)
            staging.replace(version_dir)
        except Exception:
            shutil.rmtree(staging, ignore_errors=True)
            raise

    pointer = {
        "schema_version": PUBLICATION_SCHEMA_VERSION,
        "tenant_id": tenant_id,
        "run_id": run_id,
        "catalog_version": catalog["version"],
        "artifact_dir": run_id,
        "files": {
            GRAPH_FILENAME: _sha256(_read_bytes(version_dir / GRAPH_FILENAME)),
            MANIFEST_FILENAME: _sha256(_read_bytes(version_dir / MANIFEST_FILENAME)),
            CATALOG_FILENAME: _sha256(_read_bytes(version_dir / CATALOG_FILENAME)),
        },
        "provenance": {
            "kdd_run_id": graph["source"]["kdd_run_id"],
            "case_catalog_version": graph["source"].get("case_catalog_version"),
        },
    }
    _atomic_json(tenant_root / CURRENT_FILENAME, pointer)
    return pointer


def local_publication_dry_run(source_dir: Path, local_target: Path, tenant_id: str = DEMO_TENANT_ID) -> dict[str, object]:
    """Validate source and return the intended publication without writing."""

    source = source_dir.resolve()
    manifest = _read_json(source / MANIFEST_FILENAME)
    graph_bytes = _read_bytes(source / GRAPH_FILENAME)
    if manifest.get("graph_sha256") != _sha256(graph_bytes):
        raise GraphInputError("graph manifest checksum mismatch")
    graph = _decode_graph(graph_bytes)
    catalog = _build_catalog(graph, manifest)
    return {
        "tenant_id": tenant_id,
        "run_id": manifest.get("run_id"),
        "local_target": str(local_target / tenant_id / str(manifest.get("run_id"))),
        "catalog_version": catalog["version"],
        "publication": "local_not_requested",
    }


def _build_catalog(graph: Mapping[str, object], manifest: Mapping[str, object]) -> dict[str, object]:
    nodes = graph.get("nodes")
    if not isinstance(nodes, list):
        raise GraphInputError("graph nodes are invalid")
    cases: list[str] = []
    populations: list[str] = []
    targets: list[str] = []
    items: list[str] = []
    for node in nodes:
        if not isinstance(node, Mapping) or not isinstance(node.get("attributes"), Mapping):
            raise GraphInputError("graph node is invalid")
        attributes = node["attributes"]
        kind = node.get("kind")
        if kind == "case" and isinstance(attributes.get("case_id"), str):
            cases.append(attributes["case_id"])
        elif kind == "population" and isinstance(attributes.get("name"), str):
            populations.append(attributes["name"])
        elif kind == "target" and isinstance(attributes.get("feature"), str) and isinstance(attributes.get("value"), str):
            targets.append(f"{attributes['feature']}={attributes['value']}")
        elif kind == "feature_value" and isinstance(attributes.get("feature"), str) and isinstance(attributes.get("value"), str):
            items.append(f"{attributes['feature']}={attributes['value']}")
    graph_sha = _required_string(manifest, "graph_sha256")
    return {
        "schema_version": CATALOG_SCHEMA_VERSION,
        "kind": "knowledge_graph",
        "version": f"kg-v1-{graph_sha[:16]}",
        "graph_schema_version": GRAPH_SCHEMA_VERSION,
        "operations": [
            _operation("kg.case.summary", "v1", "Aggregate analytical case and its restrictions.", "case_id", sorted(cases)),
            _operation("kg.population.summary", "v1", "Aggregate population, target and provenance.", "population", sorted(populations)),
            _operation("kg.rules.by-target", "v1", "Corroborated association rules for an allowed target.", "target", sorted(targets), "population", sorted(populations)),
            _operation("kg.rules.by-feature-value", "v1", "Corroborated rules containing an allowed feature value.", "item", sorted(items), "population", sorted(populations)),
        ],
    }


def _operation(identifier: str, version: str, description: str, first: str, first_values: list[str], second: str | None = None, second_values: list[str] | None = None) -> dict[str, object]:
    parameters = [{"name": first, "type": "string", "allowedValues": first_values}]
    if second is not None and second_values is not None:
        parameters.append({"name": second, "type": "string", "allowedValues": second_values})
    return {"id": identifier, "version": version, "description": description, "allowedRoles": ["customer", "backoffice"], "parameters": parameters}


def _decode_graph(content: bytes) -> Mapping[str, object]:
    try:
        payload = msgpack.unpackb(content, raw=False)
    except (ValueError, TypeError, msgpack.ExtraData) as error:
        raise GraphInputError("graph MsgPack cannot be decoded") from error
    if not isinstance(payload, Mapping) or payload.get("schema_version") != GRAPH_SCHEMA_VERSION:
        raise GraphInputError("graph schema is unsupported")
    source = payload.get("source")
    if not isinstance(source, Mapping) or not isinstance(source.get("kdd_run_id"), str):
        raise GraphInputError("graph provenance is invalid")
    return payload


def _read_json(path: Path) -> Mapping[str, object]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as error:
        raise GraphInputError(f"cannot read local graph artifact: {path.name}") from error
    if not isinstance(payload, Mapping):
        raise GraphInputError(f"local graph artifact is not an object: {path.name}")
    return payload


def _read_bytes(path: Path) -> bytes:
    try:
        return path.read_bytes()
    except OSError as error:
        raise GraphInputError(f"cannot read local graph artifact: {path.name}") from error


def _required_string(source: Mapping[str, object], key: str) -> str:
    value = source.get(key)
    if not isinstance(value, str) or not value:
        raise GraphInputError(f"missing string field: {key}")
    return value


def _sha256(content: bytes) -> str:
    return hashlib.sha256(content).hexdigest()


def _atomic_json(path: Path, payload: Mapping[str, object]) -> None:
    content = json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True).encode("utf-8") + b"\n"
    with tempfile.NamedTemporaryFile("wb", dir=path.parent, delete=False) as temporary:
        temporary.write(content)
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)
