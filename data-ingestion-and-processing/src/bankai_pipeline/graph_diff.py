"""Compare previous vs candidate KDD artifacts and evaluate a stability gate.

Used before promote/publish. Support snapshots are observability-only.
"""

from __future__ import annotations

import json
import tempfile
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from bankai_pipeline.kdd import consensus_rules


DIFF_SCHEMA_VERSION = "bankai-graph-diff-v1"
SUPPORT_SNAPSHOT_FILENAME = "population-support-snapshot.json"
DEFAULT_MIN_JACCARD = 0.5
DEFAULT_MAX_REMOVED_RATIO = 0.5
DEFAULT_MAX_ADDED_RATIO = 0.5
DEFAULT_MAX_ROW_COUNT_DELTA_RATIO = 0.25
DEFAULT_MIN_HOLDOUT_STABLE_FRACTION = 0.5


@dataclass(frozen=True)
class DiffGateConfig:
    """Configurable stability thresholds for promote."""

    min_jaccard: float = DEFAULT_MIN_JACCARD
    max_removed_ratio: float = DEFAULT_MAX_REMOVED_RATIO
    max_added_ratio: float = DEFAULT_MAX_ADDED_RATIO
    max_row_count_delta_ratio: float = DEFAULT_MAX_ROW_COUNT_DELTA_RATIO
    min_holdout_stable_fraction: float = DEFAULT_MIN_HOLDOUT_STABLE_FRACTION


class GraphDiffError(ValueError):
    """Invalid artifact layout or gate configuration."""


def dry_run_plan(
    previous_dir: Path,
    candidate_dir: Path,
    output: Path | None,
    gate: DiffGateConfig,
) -> dict[str, object]:
    return {
        "stage": "graph-diff",
        "previous_kdd_artifact_dir": str(previous_dir),
        "candidate_kdd_artifact_dir": str(candidate_dir),
        "diff_output": None if output is None else str(output),
        "gate": asdict(gate),
        "diff": "not_requested",
    }


def run_graph_diff(
    previous_dir: Path,
    candidate_dir: Path,
    *,
    gate: DiffGateConfig | None = None,
    output: Path | None = None,
) -> dict[str, object]:
    """Build a diff report and optionally write it under ``output``."""

    config = gate or DiffGateConfig()
    previous = _load_kdd_bundle(previous_dir)
    candidate = _load_kdd_bundle(candidate_dir)
    prev_rules = previous["rules"]
    cand_rules = candidate["rules"]
    prev_keys = set(prev_rules)
    cand_keys = set(cand_rules)
    intersection = prev_keys & cand_keys
    added = sorted(cand_keys - prev_keys)
    removed = sorted(prev_keys - cand_keys)
    jaccard = (
        len(intersection) / len(prev_keys | cand_keys)
        if prev_keys or cand_keys
        else 1.0
    )
    metric_deltas = []
    for key in sorted(intersection):
        left = prev_rules[key]
        right = cand_rules[key]
        delta = {
            "rule_id": key,
            "support_delta": round(right["support"] - left["support"], 6),
            "confidence_delta": round(right["confidence"] - left["confidence"], 6),
            "lift_delta": round(right["lift"] - left["lift"], 6),
        }
        if any(delta[field] != 0 for field in ("support_delta", "confidence_delta", "lift_delta")):
            metric_deltas.append(delta)

    row_deltas = _row_count_deltas(previous["supports"], candidate["supports"])
    holdout = _holdout_summary(candidate["validation"])
    gate_result = evaluate_gate(
        jaccard=jaccard,
        previous_count=len(prev_keys),
        added_count=len(added),
        removed_count=len(removed),
        row_deltas=row_deltas,
        holdout=holdout,
        config=config,
    )
    report: dict[str, object] = {
        "schema_version": DIFF_SCHEMA_VERSION,
        "previous_run_id": previous["run_id"],
        "candidate_run_id": candidate["run_id"],
        "consensus_rule_count": {
            "previous": len(prev_keys),
            "candidate": len(cand_keys),
            "intersection": len(intersection),
            "added": len(added),
            "removed": len(removed),
        },
        "jaccard": round(jaccard, 6),
        "added_rules": added,
        "removed_rules": removed,
        "metric_deltas": metric_deltas,
        "row_count_deltas": row_deltas,
        "holdout": holdout,
        "gate": gate_result,
    }
    if output is not None:
        destination = output if output.suffix else output / "graph-diff.json"
        destination.parent.mkdir(parents=True, exist_ok=True)
        _write_json(destination, report)
        report = {**report, "written_to": str(destination)}
    return report


def evaluate_gate(
    *,
    jaccard: float,
    previous_count: int,
    added_count: int,
    removed_count: int,
    row_deltas: Mapping[str, Mapping[str, object]],
    holdout: Mapping[str, object] | None,
    config: DiffGateConfig,
) -> dict[str, object]:
    reasons: list[str] = []
    if jaccard < config.min_jaccard:
        reasons.append(f"jaccard_below_min:{jaccard:.4f}<{config.min_jaccard}")
    denom = max(previous_count, 1)
    removed_ratio = removed_count / denom
    added_ratio = added_count / denom
    if removed_ratio > config.max_removed_ratio:
        reasons.append(f"removed_ratio_above_max:{removed_ratio:.4f}>{config.max_removed_ratio}")
    if added_ratio > config.max_added_ratio:
        reasons.append(f"added_ratio_above_max:{added_ratio:.4f}>{config.max_added_ratio}")
    for population, delta in row_deltas.items():
        ratio = float(delta["abs_delta_ratio"])
        if ratio > config.max_row_count_delta_ratio:
            reasons.append(
                f"row_count_delta_above_max:{population}:{ratio:.4f}>{config.max_row_count_delta_ratio}"
            )
    if holdout is not None and holdout.get("present"):
        stable = holdout.get("min_stable_fraction")
        if isinstance(stable, (int, float)) and float(stable) < config.min_holdout_stable_fraction:
            reasons.append(
                f"holdout_stable_below_min:{float(stable):.4f}<{config.min_holdout_stable_fraction}"
            )
    return {
        "passed": not reasons,
        "reasons": reasons,
        "thresholds": asdict(config),
    }


def assert_diff_gate_passed(report_path: Path) -> dict[str, object]:
    """Load a diff report and fail closed unless ``gate.passed`` is true."""

    payload = _read_json(report_path)
    if payload.get("schema_version") != DIFF_SCHEMA_VERSION:
        raise GraphDiffError("diff report schema is unsupported")
    gate = payload.get("gate")
    if not isinstance(gate, Mapping) or gate.get("passed") is not True:
        reasons = gate.get("reasons") if isinstance(gate, Mapping) else None
        raise GraphDiffError(f"graph-diff gate failed: {reasons or 'missing gate.passed'}")
    return payload


def build_support_snapshot(
    *,
    run_id: str,
    window: Mapping[str, object],
    populations: Mapping[str, Mapping[str, object]],
) -> dict[str, object]:
    """Build the observability-only support snapshot written by KDD."""

    return {
        "schema_version": "bankai-population-support-snapshot-v1",
        "run_id": run_id,
        "window": dict(window),
        "populations": {
            name: {
                "row_count": int(payload["row_count"]),
                "item_support": {
                    item: round(float(support), 6)
                    for item, support in sorted(dict(payload["item_support"]).items())
                },
            }
            for name, payload in sorted(populations.items())
        },
    }


def item_support_from_matrix(matrix: Any) -> dict[str, float]:
    """Compute per-item support from a boolean item matrix."""

    if getattr(matrix, "empty", True) or len(matrix.columns) == 0:
        return {}
    supports = matrix.mean(axis=0)
    return {str(item): round(float(value), 6) for item, value in supports.items()}


def _load_kdd_bundle(path: Path) -> dict[str, object]:
    root = path.resolve()
    if not root.is_dir():
        raise GraphDiffError(f"kdd artifact dir missing: {root}")
    manifest = _read_json(root / "kdd_manifest.json")
    run_id = str(manifest.get("run_id") or root.name)
    populations = manifest.get("populations")
    if not isinstance(populations, list) or not populations:
        # Fall back to scanning population JSON files.
        populations = [
            candidate.name.removesuffix("_kdd.json")
            for candidate in sorted(root.glob("*_kdd.json"))
        ]
    rules: dict[str, dict[str, float]] = {}
    for population in populations:
        if not isinstance(population, str):
            continue
        payload = _read_json(root / f"{population}_kdd.json")
        rule_sets = payload.get("rules")
        if not isinstance(rule_sets, Mapping):
            raise GraphDiffError(f"{population} rules missing")
        for rule in consensus_rules(rule_sets):  # type: ignore[arg-type]
            rule_id = _rule_id(population, rule)
            rules[rule_id] = {
                "support": float(rule["support"]),
                "confidence": float(rule["confidence"]),
                "lift": float(rule["lift"]),
            }
    supports = None
    support_path = root / SUPPORT_SNAPSHOT_FILENAME
    if support_path.is_file():
        supports = _read_json(support_path)
    validation_dir = root / "validation"
    validation: dict[str, object] = {}
    if validation_dir.is_dir():
        for path_item in sorted(validation_dir.glob("*.json")):
            validation[path_item.stem] = _read_json(path_item)
    return {
        "run_id": run_id,
        "rules": rules,
        "supports": supports,
        "validation": validation,
    }


def _rule_id(population: str, rule: Mapping[str, object]) -> str:
    antecedents = rule["antecedents"]
    if isinstance(antecedents, (list, tuple)):
        left = ",".join(str(item) for item in antecedents)
    else:
        left = str(antecedents)
    return f"{population}|{left}=>{rule['consequent']}"


def _row_count_deltas(
    previous: Mapping[str, object] | None,
    candidate: Mapping[str, object] | None,
) -> dict[str, dict[str, object]]:
    if not isinstance(previous, Mapping) or not isinstance(candidate, Mapping):
        return {}
    prev_pops = previous.get("populations")
    cand_pops = candidate.get("populations")
    if not isinstance(prev_pops, Mapping) or not isinstance(cand_pops, Mapping):
        return {}
    names = sorted(set(prev_pops) | set(cand_pops))
    deltas: dict[str, dict[str, object]] = {}
    for name in names:
        left = prev_pops.get(name) if isinstance(prev_pops.get(name), Mapping) else None
        right = cand_pops.get(name) if isinstance(cand_pops.get(name), Mapping) else None
        prev_count = int(left["row_count"]) if left and "row_count" in left else 0
        cand_count = int(right["row_count"]) if right and "row_count" in right else 0
        denom = max(prev_count, 1)
        deltas[name] = {
            "previous_row_count": prev_count,
            "candidate_row_count": cand_count,
            "delta": cand_count - prev_count,
            "abs_delta_ratio": round(abs(cand_count - prev_count) / denom, 6),
        }
    return deltas


def _holdout_summary(validation: Mapping[str, object]) -> dict[str, object] | None:
    if not validation:
        return {"present": False}
    fractions: list[float] = []
    populations: dict[str, object] = {}
    for name, payload in validation.items():
        if not isinstance(payload, Mapping):
            continue
        holdout = payload.get("holdout")
        if not isinstance(holdout, Mapping):
            continue
        stable = holdout.get("stable_fraction")
        if isinstance(stable, (int, float)):
            value = float(stable)
            fractions.append(value)
            populations[name] = {
                "stable_fraction": value,
                "stable_rule_count": holdout.get("stable_rule_count"),
                "rule_count": holdout.get("rule_count"),
            }
    if not fractions:
        return {"present": False}
    return {
        "present": True,
        "min_stable_fraction": round(min(fractions), 6),
        "populations": populations,
    }


def _read_json(path: Path) -> dict[str, object]:
    if not path.is_file():
        raise GraphDiffError(f"missing artifact: {path}")
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise GraphDiffError(f"artifact must be an object: {path}")
    return payload


def _write_json(path: Path, payload: Mapping[str, object]) -> None:
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)
