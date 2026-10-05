"""Sanitized interpretability report from existing KDD and supervised artifacts.

Association metrics stay separate from supervised classifier metrics (FuTour).
This stage never reads BigQuery and never invents k-fold results.
"""

from __future__ import annotations

import json
import math
import statistics
import tempfile
from collections import Counter
from collections.abc import Mapping, Sequence
from pathlib import Path
from typing import Any


REPORT_SCHEMA = "bankai-interpretability-report-v1"
CONFIDENCE_EPS = 1e-12


def association_rule_enrichment(rule: Mapping[str, Any]) -> dict[str, Any]:
    """Derive P(Y), conviction and leverage from support/confidence/lift."""
    support = float(rule["support"])
    confidence = float(rule["confidence"])
    lift = float(rule["lift"])
    if lift <= 0 or confidence <= 0:
        raise ValueError("rule metrics must be positive")
    prevalence = confidence / lift
    if confidence >= 1 - CONFIDENCE_EPS:
        conviction = None
    else:
        conviction = round((1.0 - prevalence) / (1.0 - confidence), 6)
    leverage = round(support * (1.0 - (1.0 / lift)), 6)
    antecedents = list(rule["antecedents"])
    return {
        "antecedents": antecedents,
        "consequent": str(rule["consequent"]),
        "support": round(support, 6),
        "confidence": round(confidence, 6),
        "lift": round(lift, 6),
        "consequent_prevalence": round(prevalence, 6),
        "conviction": conviction,
        "leverage": leverage,
        "antecedent_length": len(antecedents),
    }


def _percentile(values: Sequence[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return round(ordered[0], 6)
    index = (len(ordered) - 1) * fraction
    lower = math.floor(index)
    upper = math.ceil(index)
    if lower == upper:
        return round(ordered[lower], 6)
    weight = index - lower
    return round(ordered[lower] * (1 - weight) + ordered[upper] * weight, 6)


def _distribution(values: Sequence[float]) -> dict[str, float | None]:
    if not values:
        return {"min": None, "p50": None, "p90": None, "max": None, "mean": None}
    return {
        "min": round(min(values), 6),
        "p50": _percentile(values, 0.50),
        "p90": _percentile(values, 0.90),
        "max": round(max(values), 6),
        "mean": round(float(statistics.fmean(values)), 6),
    }


def association_rule_stats(
    rules: Sequence[Mapping[str, Any]], *, top_n: int = 10
) -> dict[str, Any]:
    enriched = [association_rule_enrichment(rule) for rule in rules]
    supports = [rule["support"] for rule in enriched]
    confidences = [rule["confidence"] for rule in enriched]
    lifts = [rule["lift"] for rule in enriched]
    convictions = [
        rule["conviction"] for rule in enriched if rule["conviction"] is not None
    ]
    leverages = [rule["leverage"] for rule in enriched]
    length_counts = Counter(rule["antecedent_length"] for rule in enriched)
    feature_counts: Counter[str] = Counter()
    by_consequent: dict[str, list[dict[str, Any]]] = {}
    for rule in enriched:
        by_consequent.setdefault(rule["consequent"], []).append(rule)
        for item in rule["antecedents"]:
            feature = item.split("=", 1)[0]
            feature_counts[feature] += 1

    consequent_summary = []
    for consequent, group in sorted(by_consequent.items()):
        consequent_summary.append(
            {
                "consequent": consequent,
                "rule_count": len(group),
                "lift": _distribution([rule["lift"] for rule in group]),
                "confidence": _distribution([rule["confidence"] for rule in group]),
                "support": _distribution([rule["support"] for rule in group]),
            }
        )

    return {
        "rule_count": len(enriched),
        "support": _distribution(supports),
        "confidence": _distribution(confidences),
        "lift": _distribution(lifts),
        "conviction": _distribution(convictions),
        "leverage": _distribution(leverages),
        "antecedent_length_histogram": {
            str(length): count for length, count in sorted(length_counts.items())
        },
        "feature_antecedent_frequency": dict(feature_counts.most_common()),
        "by_consequent": consequent_summary,
        "top_by_lift": sorted(
            enriched,
            key=lambda rule: (-rule["lift"], -rule["confidence"], -rule["support"]),
        )[:top_n],
        "top_by_conviction": sorted(
            [rule for rule in enriched if rule["conviction"] is not None],
            key=lambda rule: (-float(rule["conviction"]), -rule["lift"]),
        )[:top_n],
        "rules": enriched,
    }


def _load_json(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise ValueError(f"expected object JSON: {path}")
    return payload


def _case_manifest_name(case: str) -> str:
    return f"{case.lower()}-manifest.json"


def supervised_case_stats(manifest: Mapping[str, Any]) -> dict[str, Any]:
    case = str(manifest.get("case", "unknown"))
    target = manifest.get("target")
    metrics = manifest.get("metrics")
    evaluation = manifest.get("evaluation")
    primary: dict[str, Any]
    baseline: dict[str, Any] | None = None
    coverage: dict[str, Any] = {}
    if case == "C1" and isinstance(metrics, Mapping):
        primary = {
            "pr_auc": metrics.get("pr_auc"),
            "brier_score": metrics.get("brier_score"),
            "recall_at_0_5_informational": metrics.get("recall_at_0_5_informational"),
            "positive_prevalence": metrics.get("positive_prevalence"),
            "decision_threshold": metrics.get("decision_threshold"),
            "calibration_bins": metrics.get("calibration_bins"),
            "confusion_matrix_at_0_5_informational": metrics.get(
                "confusion_matrix_at_0_5_informational"
            ),
            "test_row_count": metrics.get("test_row_count"),
        }
        baseline = metrics.get("prevalence_baseline")
        coverage = {"test_row_count": metrics.get("test_row_count")}
    elif case == "C2" and isinstance(evaluation, Mapping):
        global_test = (
            evaluation.get("global", {}).get("test")
            if isinstance(evaluation.get("global"), Mapping)
            else None
        )
        primary = global_test if isinstance(global_test, Mapping) else {}
        coverage = {
            "row_count": primary.get("row_count"),
            "cohort_level_counts": primary.get("cohort_level_counts"),
        }
        segmented = evaluation.get("segmented")
        baseline = {
            "note": "compare segmented vs global in evaluation block",
            "segmented_present": isinstance(segmented, Mapping),
        }
    elif case == "C3" and isinstance(metrics, Mapping):
        primary = {
            "model": metrics.get("model"),
            "fraud_score": metrics.get("fraud_score"),
        }
        baseline = {"comparison": "fraud_score_dominates_experimental_nb"}
        model = metrics.get("model") if isinstance(metrics.get("model"), Mapping) else {}
        coverage = {"test_row_count": model.get("row_count")}
    elif case == "C4" and isinstance(metrics, Mapping):
        primary = dict(metrics)
        coverage = {
            target_name: (
                block.get("test", {}).get("row_count")
                if isinstance(block, Mapping) and isinstance(block.get("test"), Mapping)
                else None
            )
            for target_name, block in metrics.items()
        }
    elif case == "C5" and isinstance(metrics, Mapping):
        primary = {
            "calibration": metrics.get("calibration"),
            "test": metrics.get("test"),
        }
        test = metrics.get("test") if isinstance(metrics.get("test"), Mapping) else {}
        coverage = {
            "test_row_count": test.get("row_count"),
            "class_support": test.get("class_support"),
        }
    else:
        primary = {"raw_metrics": metrics, "raw_evaluation": evaluation}

    return {
        "case": case,
        "target": target,
        "run_id": manifest.get("run_id"),
        "schema_version": manifest.get("schema_version"),
        "split_protocol": "temporal_train_calibration_test",
        "primary_metrics": primary,
        "baseline_comparison": baseline,
        "decision_threshold": (
            primary.get("decision_threshold") if isinstance(primary, Mapping) else None
        ),
        "coverage": coverage,
        "publication": manifest.get("publication"),
    }


def validation_gaps(*, kdd_has_temporal_sets: bool = False) -> list[str]:
    gaps: list[str] = []
    if not kdd_has_temporal_sets:
        gaps.append(
            "KDD association mining has no temporal train/holdout set validation artifacts."
        )
    gaps.extend(
        [
            "No StratifiedKFold/KFold was run for C1–C5; they use temporal holdout only.",
            "C1 stratified sampling and C3 stratified_weighted sampling are not cross-validation folds.",
            "C3/C4 manifests lack calibration_bins (only C1 reports bins).",
            "C1/C3/C4 manifests lack permitted-segment error tables required by the case catalog.",
            "supervised-suite-20261003 stores hashes/blocks only; metrics are rolled up by this report.",
        ]
    )
    return gaps


def _load_kdd_set_validation(kdd_dir: Path, populations: Sequence[object]) -> dict[str, Any] | None:
    validation_dir = kdd_dir / "validation"
    if not validation_dir.is_dir():
        return None
    by_population: dict[str, Any] = {}
    for population in populations:
        name = str(population)
        holdout_path = validation_dir / f"{name}-holdout-metrics.json"
        if not holdout_path.is_file():
            continue
        payload = _load_json(holdout_path)
        folds_path = validation_dir / f"{name}-folds.json"
        if folds_path.is_file():
            payload = {**payload, "folds_file": _load_json(folds_path)}
        by_population[name] = {
            "protocol": payload.get("protocol"),
            "stable_fraction": (payload.get("holdout") or {}).get("stable_fraction")
            if isinstance(payload.get("holdout"), Mapping)
            else None,
            "consensus_rule_count": payload.get("consensus_rule_count"),
            "split": payload.get("split"),
            "has_folds": isinstance(payload.get("folds"), Mapping)
            or isinstance(payload.get("folds_file"), Mapping),
        }
    return by_population or None


def build_report(
    *,
    run_id: str,
    kdd_dir: Path,
    suite_dir: Path,
    case_dirs: Mapping[str, Path],
    graph_dir: Path | None,
) -> dict[str, Any]:
    kdd_manifest = _load_json(kdd_dir / "kdd_manifest.json")
    populations = kdd_manifest.get("populations")
    if not isinstance(populations, list):
        raise ValueError("kdd manifest populations are invalid")

    association: dict[str, Any] = {}
    for population in populations:
        payload = _load_json(kdd_dir / f"{population}_kdd.json")
        rules_by_algorithm = payload.get("rules")
        if not isinstance(rules_by_algorithm, Mapping):
            raise ValueError(f"missing rules for population {population}")
        rules = rules_by_algorithm.get("fpgrowth") or rules_by_algorithm.get("apriori")
        if not isinstance(rules, list):
            raise ValueError(f"missing consensus rules for population {population}")
        association[str(population)] = {
            "comparison": payload.get("comparison"),
            "diagnostics": payload.get("diagnostics"),
            "quality_profile": payload.get("quality_profile"),
            "feature_catalog": {
                "target": (payload.get("feature_catalog") or {}).get("target"),
                "feature_count": len(
                    (payload.get("feature_catalog") or {}).get("features") or []
                ),
                "excluded_target_leakage_columns": (
                    payload.get("feature_catalog") or {}
                ).get("excluded_target_leakage_columns"),
            },
            "stats": association_rule_stats(rules),
            "validation": payload.get("validation"),
        }

    set_validation = _load_kdd_set_validation(kdd_dir, populations)

    suite = _load_json(suite_dir / "supervised-suite-manifest.json")
    supervised: dict[str, Any] = {}
    for case in ("C1", "C2", "C3", "C4", "C5"):
        directory = case_dirs.get(case)
        if directory is None:
            raise ValueError(f"missing case artifact dir for {case}")
        manifest = _load_json(directory / _case_manifest_name(case))
        supervised[case] = supervised_case_stats(manifest)

    graph_provenance: dict[str, Any] | None = None
    if graph_dir is not None:
        graph_manifest = _load_json(graph_dir / "graph-manifest.json")
        graph_provenance = {
            "run_id": graph_manifest.get("run_id"),
            "schema_version": graph_manifest.get("schema_version"),
            "node_count": graph_manifest.get("node_count"),
            "edge_count": graph_manifest.get("edge_count"),
            "graph_sha256": graph_manifest.get("graph_sha256"),
            "source": graph_manifest.get("source"),
        }

    return {
        "schema_version": REPORT_SCHEMA,
        "run_id": run_id,
        "layers": {
            "association": association,
            "supervised": supervised,
            "blocked": suite.get("blocked_cases", {}),
        },
        "kdd_provenance": {
            "run_id": kdd_manifest.get("run_id"),
            "lineage": kdd_manifest.get("lineage"),
            "consensus_algorithms": kdd_manifest.get("consensus_algorithms"),
            "validation_config": kdd_manifest.get("validation"),
            "set_validation": set_validation,
        },
        "suite_provenance": {
            "run_id": suite.get("run_id"),
            "schema_version": suite.get("schema_version"),
        },
        "graph_provenance": graph_provenance,
        "validation_gaps": validation_gaps(kdd_has_temporal_sets=set_validation is not None),
        "semantic_note": (
            "Association support/confidence/lift/conviction/leverage are not "
            "Bayesian posteriors or classifier probabilities (FuTour separation)."
        ),
    }


def render_markdown_report(report: Mapping[str, Any]) -> str:
    lines = [
        f"# Informe de interpretabilidad `{report['run_id']}`",
        "",
        str(report["semantic_note"]),
        "",
        "## Gaps de validación",
        "",
    ]
    for gap in report["validation_gaps"]:
        lines.append(f"- {gap}")
    lines.extend(["", "## Capa asociativa (KDD)", ""])
    association = report["layers"]["association"]
    for population, block in association.items():
        stats = block["stats"]
        lines.extend(
            [
                f"### Población `{population}`",
                "",
                f"- Reglas: **{stats['rule_count']}**",
                f"- Lift: min={stats['lift']['min']} p50={stats['lift']['p50']} "
                f"p90={stats['lift']['p90']} max={stats['lift']['max']}",
                f"- Confidence: min={stats['confidence']['min']} "
                f"p50={stats['confidence']['p50']} max={stats['confidence']['max']}",
                f"- Support: min={stats['support']['min']} p50={stats['support']['p50']} "
                f"max={stats['support']['max']}",
                f"- Conviction (finite): p50={stats['conviction']['p50']} "
                f"max={stats['conviction']['max']}",
                f"- Leverage: p50={stats['leverage']['p50']} max={stats['leverage']['max']}",
                f"- Longitudes de antecedente: `{stats['antecedent_length_histogram']}`",
                f"- Comparación: `{block.get('comparison')}`",
                "",
                "Top lift:",
                "",
            ]
        )
        for rule in stats["top_by_lift"][:5]:
            antecedents = " ∧ ".join(rule["antecedents"])
            lines.append(
                f"- lift={rule['lift']} conf={rule['confidence']} supp={rule['support']} "
                f"conv={rule['conviction']} :: `{antecedents} → {rule['consequent']}`"
            )
        lines.append("")

    lines.extend(["## Capa supervisada (C1–C5)", ""])
    for case, block in report["layers"]["supervised"].items():
        lines.append(f"### {case}")
        lines.append("")
        lines.append(f"- Target: `{block.get('target')}`")
        lines.append(f"- Protocolo: `{block.get('split_protocol')}`")
        lines.append(f"- Run: `{block.get('run_id')}`")
        lines.append(f"- Cobertura: `{block.get('coverage')}`")
        primary = block.get("primary_metrics")
        if case == "C1" and isinstance(primary, Mapping):
            lines.append(
                f"- PR-AUC={primary.get('pr_auc')} Brier={primary.get('brier_score')} "
                f"recall@0.5={primary.get('recall_at_0_5_informational')} "
                f"prevalence={primary.get('positive_prevalence')}"
            )
        elif case == "C3" and isinstance(primary, Mapping):
            model = primary.get("model") if isinstance(primary.get("model"), Mapping) else {}
            fraud = (
                primary.get("fraud_score")
                if isinstance(primary.get("fraud_score"), Mapping)
                else {}
            )
            lines.append(
                f"- Model PR-AUC={model.get('pr_auc')} vs fraud_score PR-AUC={fraud.get('pr_auc')}"
            )
        elif case == "C2" and isinstance(primary, Mapping):
            lines.append(
                f"- MAE@p50={primary.get('mae_against_p50')} "
                f"p50_cov={primary.get('p50_empirical_coverage')} "
                f"p90_cov={primary.get('p90_empirical_coverage')}"
            )
        elif case == "C4" and isinstance(primary, Mapping):
            for target_name, block_metrics in primary.items():
                test = (
                    block_metrics.get("test")
                    if isinstance(block_metrics, Mapping)
                    else {}
                )
                if isinstance(test, Mapping):
                    lines.append(
                        f"- `{target_name}` test PR-AUC={test.get('pr_auc')} "
                        f"recall@0.5={test.get('recall_at_0_5_informational')}"
                    )
        elif case == "C5" and isinstance(primary, Mapping):
            test = primary.get("test") if isinstance(primary.get("test"), Mapping) else {}
            lines.append(
                f"- MAE={test.get('mae_expected_score')} "
                f"kappa={test.get('quadratic_weighted_kappa')} "
                f"macro_f1={test.get('macro_f1')}"
            )
        lines.append("")

    lines.extend(["## Casos bloqueados", ""])
    for case, reason in sorted((report["layers"].get("blocked") or {}).items()):
        lines.append(f"- **{case}**: {reason}")
    lines.append("")
    if report.get("graph_provenance"):
        graph = report["graph_provenance"]
        lines.extend(
            [
                "## Provenance del grafo",
                "",
                f"- run_id: `{graph.get('run_id')}`",
                f"- nodes/edges: {graph.get('node_count')} / {graph.get('edge_count')}",
                f"- sha256: `{graph.get('graph_sha256')}`",
                "",
            ]
        )
    return "\n".join(lines) + "\n"


def write_report(output_dir: Path, report: Mapping[str, Any]) -> dict[str, str]:
    output_dir.mkdir(parents=True, exist_ok=True)
    json_path = output_dir / "interpretability-report.json"
    md_path = output_dir / "interpretability-report.md"
    _write_json(json_path, report)
    md_path.write_text(render_markdown_report(report), encoding="utf-8")
    return {"json": str(json_path), "markdown": str(md_path)}


def run_report(
    *,
    run_id: str,
    output_dir: Path,
    kdd_dir: Path,
    suite_dir: Path,
    case_dirs: Mapping[str, Path],
    graph_dir: Path | None,
) -> dict[str, Any]:
    report = build_report(
        run_id=run_id,
        kdd_dir=kdd_dir,
        suite_dir=suite_dir,
        case_dirs=case_dirs,
        graph_dir=graph_dir,
    )
    paths = write_report(output_dir, report)
    return {
        "schema_version": REPORT_SCHEMA,
        "run_id": run_id,
        "output": paths,
        "association_rule_counts": {
            population: block["stats"]["rule_count"]
            for population, block in report["layers"]["association"].items()
        },
        "supervised_cases": sorted(report["layers"]["supervised"]),
        "validation_gap_count": len(report["validation_gaps"]),
    }


def dry_run_plan(
    *,
    run_id: str,
    kdd_dir: Path,
    suite_dir: Path,
    case_dirs: Mapping[str, Path],
    graph_dir: Path | None,
    output_dir: Path,
) -> dict[str, Any]:
    return {
        "stage": "report-metrics",
        "run_id": run_id,
        "kdd_artifact_dir": str(kdd_dir),
        "supervised_suite_artifact_dir": str(suite_dir),
        "case_artifact_dirs": {
            case: str(path) for case, path in sorted(case_dirs.items())
        },
        "graph_artifact_dir": str(graph_dir) if graph_dir else None,
        "output_dir": str(output_dir),
        "writes": ["interpretability-report.json", "interpretability-report.md"],
        "bigquery": "not_requested",
    }


def _write_json(path: Path, payload: Mapping[str, Any]) -> None:
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)
