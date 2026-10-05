"""Reproducible, read-only KDD for transaction issue and dispute triage."""

from __future__ import annotations

import gc
import hashlib
import json
import re
import sys
import tempfile
import time
import tomllib
import warnings
from collections.abc import Iterable, Mapping
from dataclasses import asdict, dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

import pandas as pd
import polars as pl

from bankai_pipeline.data_understanding import profile_frame
from bankai_pipeline.dispute_contracts import TableContract, validate_schema
from bankai_pipeline.frequent_itemsets import apriori_hybrid, eclat, itemset_keys


IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,1023}$")
PROJECT_ID = re.compile(r"^[a-z][a-z0-9-]{4,61}[a-z0-9]$")
RUN_ID = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
ALGORITHMS = frozenset({"apriori", "fpgrowth", "eclat", "apriori_hybrid"})
CONSENSUS_ALGORITHMS = frozenset({"apriori", "fpgrowth", "eclat"})
DEFAULT_HAN_REDUNDANCY_EPSILON = 0.05


@dataclass(frozen=True)
class PopulationDefinition:
    name: str
    table: str
    primary_key: str
    timestamp_column: str
    target_column: str
    categorical_columns: tuple[str, ...]
    boolean_columns: tuple[str, ...]
    numeric_columns: tuple[str, ...]
    contract: TableContract
    row_filter_sql: str | None = None
    # Features excluded as antecedents when mining the configured target (anti-leakage).
    target_leakage_booleans: tuple[str, ...] = ()
    target_leakage_numerics: tuple[str, ...] = ()
    # Ancestor/descendant feature pairs that must not co-occur in one antecedent.
    hierarchical_pairs: tuple[tuple[str, str], ...] = ()
    # Numeric columns that never emit NON_NEGATIVE sign items (filler reduction).
    non_negative_numeric_columns: tuple[str, ...] = ()

    @property
    def selected_columns(self) -> tuple[str, ...]:
        return (
            self.primary_key,
            self.timestamp_column,
            self.target_column,
            *self.categorical_columns,
            *self.boolean_columns,
            *self.numeric_columns,
        )


@dataclass(frozen=True)
class KddValidationConfig:
    """Temporal blocked set validation over the full in-window population."""

    enabled: bool = True
    holdout_fraction: float = 0.20
    n_folds: int = 1
    max_confidence_delta: float = 0.10


@dataclass(frozen=True)
class KddConfig:
    project: str
    dataset: str
    start_timestamp: datetime
    end_timestamp: datetime
    output_dir: Path
    maximum_bytes_billed: int
    max_rows: int
    algorithms: tuple[str, ...]
    min_support: float
    min_confidence: float
    min_lift: float
    max_itemset_length: int
    max_categorical_cardinality: int
    han_redundancy_epsilon: float = DEFAULT_HAN_REDUNDANCY_EPSILON
    validation: KddValidationConfig = field(default_factory=KddValidationConfig)


class BigQueryKddClient(Protocol):
    def get_table(self, table: str) -> Any: ...

    def query(self, query: str, job_config: Any) -> Any: ...


def population_definitions() -> tuple[PopulationDefinition, ...]:
    from bankai_pipeline.dispute_contracts import COMPLAINTS, TRANSACTIONS

    return (
        PopulationDefinition(
            name="transactions",
            table="transactions",
            primary_key="transaction_id",
            timestamp_column="transaction_date",
            target_column="transaction_status",
            categorical_columns=(
                "transaction_type",
                "transaction_category",
                "channel",
                "merchant_category",
                "currency",
                "response_code",
            ),
            boolean_columns=("is_fraud",),
            numeric_columns=("amount", "fraud_score"),
            contract=TRANSACTIONS,
        ),
        PopulationDefinition(
            name="complaints",
            table="complaints",
            primary_key="complaint_id",
            timestamp_column="creation_date",
            target_column="status",
            categorical_columns=(
                "case_type",
                "category",
                "subcategory",
                "reception_channel",
                "priority",
            ),
            boolean_columns=("sla_breached", "is_repeat_complainer"),
            numeric_columns=("claimed_amount", "resolution_days"),
            contract=COMPLAINTS,
            row_filter_sql="`category` = 'Transactions'",
            target_leakage_booleans=("sla_breached",),
            target_leakage_numerics=("resolution_days",),
            hierarchical_pairs=(("category", "subcategory"),),
            non_negative_numeric_columns=("claimed_amount",),
        ),
    )


def load_config(path: Path) -> KddConfig:
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    settings = data.get("kdd")
    if not isinstance(settings, Mapping):
        raise ValueError("kdd TOML section is required")
    project = _require_string(settings, "project")
    dataset = _require_string(settings, "dataset")
    if not PROJECT_ID.fullmatch(project) or not IDENTIFIER.fullmatch(dataset):
        raise ValueError("project or dataset identifier is invalid")
    algorithms = tuple(_require_string_list(settings, "algorithms"))
    if not algorithms or any(algorithm not in ALGORITHMS for algorithm in algorithms):
        raise ValueError(
            "algorithms must be chosen from apriori, fpgrowth, eclat, apriori_hybrid"
        )
    max_rows = _require_positive_int(settings, "max_rows")
    if len(algorithms) > 1 and max_rows > 5_000_000:
        raise ValueError("multi-algorithm KDD requires max_rows <= 5000000")
    han_epsilon = settings.get("han_redundancy_epsilon", DEFAULT_HAN_REDUNDANCY_EPSILON)
    if not isinstance(han_epsilon, (int, float)) or han_epsilon < 0 or han_epsilon > 1:
        raise ValueError("han_redundancy_epsilon must be in [0, 1]")
    config = KddConfig(
        project=project,
        dataset=dataset,
        start_timestamp=_parse_timestamp(_require_string(settings, "start_timestamp")),
        end_timestamp=_parse_timestamp(_require_string(settings, "end_timestamp")),
        output_dir=Path(_require_string(settings, "output_dir")),
        maximum_bytes_billed=_require_positive_int(settings, "maximum_bytes_billed"),
        max_rows=max_rows,
        algorithms=algorithms,
        min_support=_require_probability(settings, "min_support"),
        min_confidence=_require_probability(settings, "min_confidence"),
        min_lift=_require_positive_float(settings, "min_lift"),
        max_itemset_length=_require_positive_int(settings, "max_itemset_length"),
        max_categorical_cardinality=_require_positive_int(
            settings, "max_categorical_cardinality"
        ),
        han_redundancy_epsilon=float(han_epsilon),
        validation=_load_validation_config(settings.get("validation")),
    )
    if config.end_timestamp <= config.start_timestamp:
        raise ValueError("end_timestamp must be after start_timestamp")
    if config.max_itemset_length > 4:
        raise ValueError("max_itemset_length must be <= 4 for the first KDD")
    return config


def dry_run_plan(config: KddConfig) -> dict[str, object]:
    return {
        "project": config.project,
        "dataset": config.dataset,
        "populations": [
            {
                "name": definition.name,
                "row_filter_sql": definition.row_filter_sql,
                "target": definition.target_column,
                "leakage_excluded": [
                    *definition.target_leakage_booleans,
                    *definition.target_leakage_numerics,
                ],
                "hierarchical_pairs": [
                    {"ancestor": ancestor, "descendant": descendant}
                    for ancestor, descendant in definition.hierarchical_pairs
                ],
            }
            for definition in population_definitions()
        ],
        "algorithms": list(config.algorithms),
        "time_window": {
            "start": config.start_timestamp.isoformat(),
            "end": config.end_timestamp.isoformat(),
        },
        "max_rows": config.max_rows,
        "validation": asdict(config.validation),
        "graph_compilation": "not_requested",
    }


def run_kdd(config: KddConfig, run_id: str, client: BigQueryKddClient) -> dict[str, object]:
    if not RUN_ID.fullmatch(run_id):
        raise ValueError("run_id must be opaque and match the allowed format")
    results: dict[str, object] = {}
    lineage: list[dict[str, object]] = []
    validation_artifacts: dict[str, object] = {}
    for definition in population_definitions():
        _progress(f"population={definition.name} assert_contract")
        _assert_contract(client, config, definition)
        _progress(f"population={definition.name} read_bigquery")
        frame, source = _read_population(client, config, definition)
        _progress(
            f"population={definition.name} rows={frame.height} profile_and_encode"
        )
        # Profiling stays on pandas; encoding uses Polars to avoid iterrows RAM spikes.
        profile_frame_pd = frame.to_pandas(use_pyarrow_extension_array=True)
        profile = profile_frame(
            profile_frame_pd,
            primary_key=definition.primary_key,
            numeric_columns=definition.numeric_columns,
            categorical_columns=(definition.target_column, *definition.categorical_columns),
        )
        del profile_frame_pd
        gc.collect()

        train_frame = frame
        holdout_frame: pl.DataFrame | None = None
        split_meta: dict[str, object] | None = None
        if config.validation.enabled:
            train_frame, holdout_frame, split_meta = temporal_train_holdout_split(
                frame,
                definition.timestamp_column,
                config.start_timestamp,
                config.end_timestamp,
                config.validation.holdout_fraction,
            )
            _progress(
                f"population={definition.name} temporal_split "
                f"train_rows={train_frame.height} holdout_rows={holdout_frame.height}"
            )

        matrix, feature_catalog = build_item_matrix(train_frame, definition, config)
        del train_frame
        gc.collect()
        _progress(
            f"population={definition.name} matrix_shape={matrix.shape} "
            f"mine algorithms={list(config.algorithms)}"
        )
        mined = _mine_matrix_rules(matrix, definition, config)
        rules_by_algorithm = mined["rules_by_algorithm"]
        diagnostics = mined["diagnostics"]
        comparison = compare_rule_sets(rules_by_algorithm)

        validation_payload: dict[str, object] | None = None
        if config.validation.enabled and holdout_frame is not None and split_meta is not None:
            holdout_matrix, _ = build_item_matrix(holdout_frame, definition, config)
            holdout_matrix = holdout_matrix.reindex(columns=matrix.columns, fill_value=False)
            consensus = consensus_rules(rules_by_algorithm)
            holdout_eval = evaluate_rules_on_matrix(
                consensus,
                holdout_matrix,
                min_lift=config.min_lift,
                max_confidence_delta=config.validation.max_confidence_delta,
            )
            validation_payload = {
                "protocol": "temporal_train_holdout",
                "split": split_meta,
                "train_row_count": int(len(matrix)),
                "holdout_row_count": int(len(holdout_matrix)),
                "consensus_rule_count": len(consensus),
                "holdout": holdout_eval,
            }
            if config.validation.n_folds > 1:
                validation_payload["folds"] = temporal_blocked_fold_validation(
                    frame,
                    definition,
                    config,
                )
            validation_artifacts[definition.name] = validation_payload
            del holdout_matrix
            del holdout_frame
            gc.collect()

        del frame
        results[definition.name] = {
            "quality_profile": profile,
            "feature_catalog": feature_catalog,
            "rules": rules_by_algorithm,
            "comparison": comparison,
            "diagnostics": diagnostics,
            "validation": validation_payload,
        }
        lineage.append(source)
        del matrix
        gc.collect()
        _progress(f"population={definition.name} complete")
    manifest = {
        "run_id": run_id,
        "kdd_version": "v1",
        "config_hash": _hash_json(asdict(config)),
        "lineage": lineage,
        "populations": list(results),
        "graph_compilation": "not_requested",
        "consensus_algorithms": sorted(CONSENSUS_ALGORITHMS),
        "validation": asdict(config.validation),
    }
    output_dir = config.output_dir / run_id
    write_artifacts(output_dir, manifest, results)
    if validation_artifacts:
        write_validation_artifacts(output_dir, validation_artifacts)
    _progress(f"run_id={run_id} artifacts_written")
    return manifest


def mine_frequent_itemsets(
    matrix: pd.DataFrame, algorithm: str, config: KddConfig
) -> pd.DataFrame:
    if matrix.empty:
        return pd.DataFrame(columns=["support", "itemsets"])
    from mlxtend.frequent_patterns import apriori, fpgrowth

    # mlxtend's horizontal Apriori materializes large candidate matrices and OOMs
    # around multi-million rows; the vertical TID backend yields the same itemsets.
    if algorithm == "apriori" and len(matrix) > 100_000:
        miner = apriori_hybrid
    else:
        miners = {
            "apriori": apriori,
            "fpgrowth": fpgrowth,
            "eclat": eclat,
            "apriori_hybrid": apriori_hybrid,
        }
        miner = miners[algorithm]
    return miner(
        matrix,
        min_support=config.min_support,
        use_colnames=True,
        max_len=config.max_itemset_length,
    )


def _load_validation_config(raw: object) -> KddValidationConfig:
    if raw is None:
        return KddValidationConfig()
    if not isinstance(raw, Mapping):
        raise ValueError("kdd.validation must be a table")
    enabled = raw.get("enabled", True)
    if not isinstance(enabled, bool):
        raise ValueError("kdd.validation.enabled must be a boolean")
    holdout_fraction = raw.get("holdout_fraction", 0.20)
    if not isinstance(holdout_fraction, (int, float)) or not 0 < float(holdout_fraction) < 1:
        raise ValueError("kdd.validation.holdout_fraction must be in (0, 1)")
    n_folds = raw.get("n_folds", 1)
    if not isinstance(n_folds, int) or n_folds < 1:
        raise ValueError("kdd.validation.n_folds must be a positive integer")
    max_confidence_delta = raw.get("max_confidence_delta", 0.10)
    if not isinstance(max_confidence_delta, (int, float)) or not 0 <= float(max_confidence_delta) <= 1:
        raise ValueError("kdd.validation.max_confidence_delta must be in [0, 1]")
    return KddValidationConfig(
        enabled=enabled,
        holdout_fraction=float(holdout_fraction),
        n_folds=n_folds,
        max_confidence_delta=float(max_confidence_delta),
    )


def temporal_train_holdout_split(
    frame: pl.DataFrame,
    timestamp_column: str,
    start: datetime,
    end: datetime,
    holdout_fraction: float,
) -> tuple[pl.DataFrame, pl.DataFrame, dict[str, object]]:
    """Split the full population by the configured time window (no row sampling)."""

    if not 0 < holdout_fraction < 1:
        raise ValueError("holdout_fraction must be in (0, 1)")
    cutoff = start + (end - start) * (1.0 - holdout_fraction)
    train = frame.filter(pl.col(timestamp_column) < cutoff)
    holdout = frame.filter(pl.col(timestamp_column) >= cutoff)
    if train.height == 0 or holdout.height == 0:
        raise ValueError("temporal validation produced an empty train or holdout set")
    return train, holdout, {
        "cutoff": cutoff.isoformat(),
        "holdout_fraction": holdout_fraction,
        "train_rows": int(train.height),
        "holdout_rows": int(holdout.height),
    }


def temporal_blocks(
    frame: pl.DataFrame,
    timestamp_column: str,
    start: datetime,
    end: datetime,
    n_folds: int,
) -> list[pl.DataFrame]:
    if n_folds < 2:
        raise ValueError("n_folds must be >= 2 for blocked folds")
    span = end - start
    blocks: list[pl.DataFrame] = []
    for index in range(n_folds):
        lo = start + span * (index / n_folds)
        hi = end if index == n_folds - 1 else start + span * ((index + 1) / n_folds)
        block = frame.filter(
            (pl.col(timestamp_column) >= lo) & (pl.col(timestamp_column) < hi)
        )
        if block.height == 0:
            raise ValueError(f"temporal fold {index} is empty")
        blocks.append(block)
    return blocks


def _mine_matrix_rules(
    matrix: pd.DataFrame, definition: PopulationDefinition, config: KddConfig
) -> dict[str, object]:
    rules_by_algorithm: dict[str, list[dict[str, object]]] = {}
    mining_seconds: dict[str, float] = {}
    itemset_keys_by_algorithm: dict[str, set[frozenset[Any]]] = {}
    apriori_itemsets_for_fpmax: pd.DataFrame | None = None
    large_matrix = len(matrix) > 100_000
    for algorithm in config.algorithms:
        started = time.perf_counter()
        _progress(f"population={definition.name} algorithm={algorithm} start")
        if (
            large_matrix
            and algorithm == "apriori_hybrid"
            and "apriori" in rules_by_algorithm
        ):
            itemset_keys_by_algorithm[algorithm] = set(itemset_keys_by_algorithm["apriori"])
            rules_by_algorithm[algorithm] = list(rules_by_algorithm["apriori"])
            mining_seconds[algorithm] = 0.0
            _progress(
                f"population={definition.name} algorithm={algorithm} reused_vertical_apriori"
            )
            continue
        itemsets = mine_frequent_itemsets(matrix, algorithm, config)
        itemset_keys_by_algorithm[algorithm] = itemset_keys(itemsets)
        rules_by_algorithm[algorithm] = refine_mined_rules(
            rules_from_itemsets(itemsets, definition.target_column, config),
            definition,
            epsilon=config.han_redundancy_epsilon,
        )
        if algorithm == "apriori" and not large_matrix:
            apriori_itemsets_for_fpmax = itemsets
        else:
            del itemsets
        mining_seconds[algorithm] = round(time.perf_counter() - started, 6)
        _progress(
            f"population={definition.name} algorithm={algorithm} "
            f"seconds={mining_seconds[algorithm]} "
            f"rules={len(rules_by_algorithm[algorithm])}"
        )
        gc.collect()
    diagnostics = {
        "mining_seconds": mining_seconds,
        "hybrid_apriori_parity": _assert_hybrid_apriori_parity_keys(itemset_keys_by_algorithm),
        "apriori_backend": _apriori_backend_name(len(matrix)),
        **fpmax_diagnostics(matrix, apriori_itemsets_for_fpmax, config),
    }
    return {"rules_by_algorithm": rules_by_algorithm, "diagnostics": diagnostics}


def consensus_rules(
    rules_by_algorithm: Mapping[str, list[dict[str, object]]],
) -> list[dict[str, object]]:
    """Return corroborated Apriori ∩ FP-Growth ∩ Eclat rules with shared metrics."""

    required = sorted(CONSENSUS_ALGORITHMS)
    if any(algorithm not in rules_by_algorithm for algorithm in required):
        return []
    indexed = {
        algorithm: {_rule_key(rule): rule for rule in rules_by_algorithm[algorithm]}
        for algorithm in required
    }
    shared = set.intersection(*(set(index) for index in indexed.values()))
    output: list[dict[str, object]] = []
    for key in sorted(shared):
        metrics = [indexed[algorithm][key] for algorithm in required]
        if not all(
            metrics[0]["support"] == other["support"]
            and metrics[0]["confidence"] == other["confidence"]
            and metrics[0]["lift"] == other["lift"]
            for other in metrics[1:]
        ):
            continue
        output.append(dict(metrics[0]))
    return output


def evaluate_rules_on_matrix(
    rules: list[dict[str, object]],
    matrix: pd.DataFrame,
    *,
    min_lift: float,
    max_confidence_delta: float,
) -> dict[str, object]:
    """Recompute support/confidence/lift for mined rules on a held-out matrix."""

    evaluated: list[dict[str, object]] = []
    stable = 0
    if matrix.empty or not rules:
        return {
            "rule_count": len(rules),
            "stable_rule_count": 0,
            "stable_fraction": 1.0 if not rules else 0.0,
            "rules": [],
        }
    for rule in rules:
        antecedents = list(rule["antecedents"])
        consequent = str(rule["consequent"])
        missing = [item for item in (*antecedents, consequent) if item not in matrix.columns]
        if missing:
            holdout_support = 0.0
            holdout_confidence = 0.0
            holdout_lift = 0.0
        else:
            antecedent_mask = (
                matrix[antecedents].all(axis=1)
                if antecedents
                else pd.Series(True, index=matrix.index)
            )
            consequent_mask = matrix[consequent]
            joint = antecedent_mask & consequent_mask
            holdout_support = float(joint.mean())
            antecedent_support = float(antecedent_mask.mean())
            consequent_support = float(consequent_mask.mean())
            holdout_confidence = (
                float(joint.sum() / antecedent_mask.sum()) if antecedent_mask.any() else 0.0
            )
            holdout_lift = (
                holdout_confidence / consequent_support if consequent_support > 0 else 0.0
            )
        confidence_delta = abs(holdout_confidence - float(rule["confidence"]))
        is_stable = holdout_lift >= min_lift and confidence_delta <= max_confidence_delta
        if is_stable:
            stable += 1
        evaluated.append(
            {
                "antecedents": antecedents,
                "consequent": consequent,
                "train_support": rule["support"],
                "train_confidence": rule["confidence"],
                "train_lift": rule["lift"],
                "holdout_support": round(holdout_support, 6),
                "holdout_confidence": round(holdout_confidence, 6),
                "holdout_lift": round(holdout_lift, 6),
                "confidence_delta": round(confidence_delta, 6),
                "stable": is_stable,
            }
        )
    return {
        "rule_count": len(rules),
        "stable_rule_count": stable,
        "stable_fraction": round(stable / len(rules), 6) if rules else 1.0,
        "rules": evaluated,
    }


def temporal_blocked_fold_validation(
    frame: pl.DataFrame,
    definition: PopulationDefinition,
    config: KddConfig,
) -> dict[str, object]:
    """Mine on all-but-fold-i / evaluate on fold-i; report cross-fold Jaccard."""

    blocks = temporal_blocks(
        frame,
        definition.timestamp_column,
        config.start_timestamp,
        config.end_timestamp,
        config.validation.n_folds,
    )
    fold_keys: list[set[tuple[tuple[str, ...], str]]] = []
    fold_summaries: list[dict[str, object]] = []
    for index, holdout_block in enumerate(blocks):
        train_parts = [block for fold_index, block in enumerate(blocks) if fold_index != index]
        train_frame = pl.concat(train_parts, how="vertical_relaxed")
        train_matrix, _ = build_item_matrix(train_frame, definition, config)
        mined = _mine_matrix_rules(train_matrix, definition, config)
        consensus = consensus_rules(mined["rules_by_algorithm"])
        holdout_matrix, _ = build_item_matrix(holdout_block, definition, config)
        holdout_matrix = holdout_matrix.reindex(columns=train_matrix.columns, fill_value=False)
        evaluation = evaluate_rules_on_matrix(
            consensus,
            holdout_matrix,
            min_lift=config.min_lift,
            max_confidence_delta=config.validation.max_confidence_delta,
        )
        keys = {_rule_key(rule) for rule in consensus}
        fold_keys.append(keys)
        fold_summaries.append(
            {
                "fold": index,
                "train_rows": int(len(train_matrix)),
                "holdout_rows": int(len(holdout_matrix)),
                "consensus_rule_count": len(consensus),
                "stable_fraction": evaluation["stable_fraction"],
            }
        )
        del train_matrix
        del holdout_matrix
        gc.collect()
    pairwise: dict[str, float] = {}
    for left in range(len(fold_keys)):
        for right in range(left + 1, len(fold_keys)):
            union = fold_keys[left] | fold_keys[right]
            jaccard = (
                len(fold_keys[left] & fold_keys[right]) / len(union) if union else 1.0
            )
            pairwise[f"{left}_vs_{right}"] = round(jaccard, 6)
    shared = set.intersection(*fold_keys) if fold_keys else set()
    union_all = set.union(*fold_keys) if fold_keys else set()
    return {
        "n_folds": config.validation.n_folds,
        "folds": fold_summaries,
        "pairwise_jaccard": pairwise,
        "multi_fold_jaccard": round(len(shared) / len(union_all), 6) if union_all else 1.0,
        "shared_rule_count": len(shared),
    }


def write_validation_artifacts(
    output_dir: Path, validation_artifacts: Mapping[str, object]
) -> None:
    validation_dir = output_dir / "validation"
    validation_dir.mkdir(parents=True, exist_ok=True)
    for population, payload in validation_artifacts.items():
        if not isinstance(payload, Mapping):
            continue
        _write_json(validation_dir / f"{population}-holdout-metrics.json", payload)
        folds = payload.get("folds")
        if isinstance(folds, Mapping):
            _write_json(validation_dir / f"{population}-folds.json", folds)


def _apriori_backend_name(row_count: int) -> str:
    return "vertical_tid" if row_count > 100_000 else "mlxtend_apriori"


def rules_from_itemsets(
    itemsets: pd.DataFrame, target_column: str, config: KddConfig
) -> list[dict[str, object]]:
    if itemsets.empty:
        return []
    from mlxtend.frequent_patterns import association_rules

    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        rules = association_rules(
            itemsets,
            metric="confidence",
            min_threshold=config.min_confidence,
        )
    if rules.empty:
        return []
    target_prefix = f"{target_column}="
    selected = rules[
        (rules["lift"] >= config.min_lift)
        & (rules["consequents"].map(lambda values: len(values) == 1))
        & (rules["consequents"].map(lambda values: next(iter(values)).startswith(target_prefix)))
        & (~rules["antecedents"].map(lambda values: any(item.startswith(target_prefix) for item in values)))
    ]
    output = []
    for _, rule in selected.sort_values(["lift", "confidence", "support"], ascending=False).iterrows():
        output.append(
            {
                "antecedents": sorted(rule["antecedents"]),
                "consequent": next(iter(rule["consequents"])),
                "support": round(float(rule["support"]), 6),
                "confidence": round(float(rule["confidence"]), 6),
                "lift": round(float(rule["lift"]), 6),
            }
        )
    return output


def fpmax_diagnostics(
    matrix: pd.DataFrame, apriori_itemsets: pd.DataFrame | None, config: KddConfig
) -> dict[str, object]:
    if matrix.empty:
        return {
            "fpmax_maximal_itemset_count": 0,
            "fpmax_overlap_with_apriori_itemsets": 0,
        }
    if len(matrix) > 100_000:
        return {
            "fpmax_maximal_itemset_count": None,
            "fpmax_overlap_with_apriori_itemsets": None,
            "fpmax_skipped": "row_count_gt_100000",
        }
    from mlxtend.frequent_patterns import fpmax

    maximal = fpmax(
        matrix,
        min_support=config.min_support,
        use_colnames=True,
        max_len=config.max_itemset_length,
    )
    maximal_keys = itemset_keys(maximal)
    apriori_keys = itemset_keys(apriori_itemsets) if apriori_itemsets is not None else set()
    return {
        "fpmax_maximal_itemset_count": len(maximal_keys),
        "fpmax_overlap_with_apriori_itemsets": len(maximal_keys & apriori_keys),
    }


def _assert_hybrid_apriori_parity(
    itemsets_by_algorithm: Mapping[str, pd.DataFrame],
) -> dict[str, object]:
    if "apriori" not in itemsets_by_algorithm or "apriori_hybrid" not in itemsets_by_algorithm:
        return {"checked": False, "equal": None}
    return _assert_hybrid_apriori_parity_keys(
        {
            "apriori": itemset_keys(itemsets_by_algorithm["apriori"]),
            "apriori_hybrid": itemset_keys(itemsets_by_algorithm["apriori_hybrid"]),
        }
    )


def _assert_hybrid_apriori_parity_keys(
    itemset_keys_by_algorithm: Mapping[str, set[frozenset[Any]]],
) -> dict[str, object]:
    if "apriori" not in itemset_keys_by_algorithm or "apriori_hybrid" not in itemset_keys_by_algorithm:
        return {"checked": False, "equal": None}
    left = itemset_keys_by_algorithm["apriori"]
    right = itemset_keys_by_algorithm["apriori_hybrid"]
    if left != right:
        raise ValueError(
            "apriori_hybrid itemsets diverged from apriori; "
            f"only_apriori={len(left - right)} only_hybrid={len(right - left)}"
        )
    return {"checked": True, "equal": True, "itemset_count": len(left)}


def _assert_contract(
    client: BigQueryKddClient, config: KddConfig, definition: PopulationDefinition
) -> None:
    table = client.get_table(_table_ref(config, definition.table))
    actual_fields = {field.name: field.field_type for field in table.schema}
    report = validate_schema(definition.name, actual_fields)
    if not report.valid:
        raise ValueError(
            f"schema contract rejected {definition.name}: "
            f"missing={report.missing_required} unexpected_types={report.unexpected_types}"
        )
    required = set(definition.selected_columns)
    missing = sorted(required - set(actual_fields))
    if missing:
        raise ValueError(f"KDD projection missing columns for {definition.name}: {missing}")


def _read_population(
    client: BigQueryKddClient, config: KddConfig, definition: PopulationDefinition
) -> tuple[pl.DataFrame, dict[str, object]]:
    from google.cloud import bigquery

    table = _table_ref(config, definition.table)
    columns = ", ".join(f"`{column}`" for column in definition.selected_columns)
    filters = [
        f"`{definition.timestamp_column}` >= @start_timestamp",
        f"`{definition.timestamp_column}` < @end_timestamp",
    ]
    if definition.row_filter_sql:
        filters.append(f"({definition.row_filter_sql})")
    where_clause = "\n  AND ".join(filters)
    query = f"""
SELECT {columns}
FROM `{table}`
WHERE {where_clause}
ORDER BY FARM_FINGERPRINT(CAST(`{definition.primary_key}` AS STRING))
LIMIT @max_rows
""".strip()
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("start_timestamp", "TIMESTAMP", config.start_timestamp),
            bigquery.ScalarQueryParameter("end_timestamp", "TIMESTAMP", config.end_timestamp),
            bigquery.ScalarQueryParameter("max_rows", "INT64", config.max_rows),
        ],
        maximum_bytes_billed=config.maximum_bytes_billed,
        use_query_cache=False,
        labels={"component": "kdd", "population": definition.name},
    )
    job = client.query(query, job_config=job_config)
    _progress(
        f"population={definition.name} bigquery_job={job.job_id} "
        "download_arrow_bqstorage"
    )
    # Prefer BigQuery Storage API (gRPC/Arrow) over REST page fetches.
    arrow_table = job.result().to_arrow(create_bqstorage_client=True)
    frame = pl.from_arrow(arrow_table)
    _progress(
        f"population={definition.name} arrow_rows={frame.height} "
        f"download_complete bytes_processed={int(job.total_bytes_processed or 0)}"
    )
    return frame, {
        "population": definition.name,
        "table": f"{config.dataset}.{definition.table}",
        "query_id": f"kdd_{definition.name}_v1",
        "query_hash": hashlib.sha256(query.encode("utf-8")).hexdigest(),
        "job_id": job.job_id,
        "total_bytes_processed": int(job.total_bytes_processed or 0),
        "row_count": int(frame.height),
    }


def build_item_matrix(
    frame: pl.DataFrame | pd.DataFrame, definition: PopulationDefinition, config: KddConfig
) -> tuple[pd.DataFrame, dict[str, object]]:
    """Build a boolean item matrix with Polars; return pandas for mlxtend miners."""
    table = pl.from_pandas(frame) if isinstance(frame, pd.DataFrame) else frame
    catalog: dict[str, object] = {"target": definition.target_column, "features": []}
    categorical = (definition.target_column, *definition.categorical_columns)
    permitted = [definition.target_column]
    for column in definition.categorical_columns:
        cardinality = table.select(pl.col(column).drop_nulls().n_unique()).item()
        if cardinality <= config.max_categorical_cardinality:
            permitted.append(column)
    excluded = sorted(set(categorical) - set(permitted))
    boolean_columns = tuple(
        column
        for column in definition.boolean_columns
        if column not in definition.target_leakage_booleans
    )
    numeric_columns = tuple(
        column
        for column in definition.numeric_columns
        if column not in definition.target_leakage_numerics
    )
    leakage_excluded = sorted(
        {*definition.target_leakage_booleans, *definition.target_leakage_numerics}
    )

    item_expressions: list[pl.Expr] = []
    for column in permitted:
        sanitized = _sanitize_categorical_expr(column)
        values = (
            table.select(sanitized.alias("__value"))
            .get_column("__value")
            .unique(maintain_order=True)
            .to_list()
        )
        for value in values:
            item_expressions.append(
                (sanitized == pl.lit(value)).alias(f"{column}={value}")
            )
    for column in boolean_columns:
        missing = pl.col(column).is_null()
        truthy = pl.col(column).fill_null(False).cast(pl.Boolean)
        item_expressions.extend(
            [
                missing.alias(f"{column}=UNKNOWN"),
                ((~missing) & truthy).alias(f"{column}=TRUE"),
                ((~missing) & (~truthy)).alias(f"{column}=FALSE"),
            ]
        )
    for column in numeric_columns:
        bounds = _numeric_bounds_polars(table.get_column(column))
        item_expressions.extend(
            _numeric_item_expressions(
                column,
                bounds,
                emit_non_negative_sign=column
                not in definition.non_negative_numeric_columns,
            )
        )

    if not item_expressions:
        matrix = pd.DataFrame(index=range(table.height))
    else:
        encoded = table.select(item_expressions)
        # Drop all-false columns (e.g. unused boolean UNKNOWN).
        keep = [
            name
            for name in encoded.columns
            if encoded.select(pl.col(name).any()).item()
        ]
        matrix = (
            encoded.select(keep).to_pandas(use_pyarrow_extension_array=False)
            if keep
            else pd.DataFrame(index=range(table.height))
        )
        matrix = matrix.astype(bool)

    catalog["features"] = sorted(matrix.columns.tolist())
    catalog["excluded_high_cardinality_columns"] = excluded
    catalog["excluded_target_leakage_columns"] = leakage_excluded
    catalog["hierarchical_pairs"] = [
        {"ancestor": ancestor, "descendant": descendant}
        for ancestor, descendant in definition.hierarchical_pairs
    ]
    return matrix, catalog


def mine_rules(
    matrix: pd.DataFrame, target_column: str, algorithm: str, config: KddConfig
) -> list[dict[str, object]]:
    return rules_from_itemsets(
        mine_frequent_itemsets(matrix, algorithm, config), target_column, config
    )


def refine_mined_rules(
    rules: list[dict[str, object]],
    definition: PopulationDefinition,
    *,
    epsilon: float = DEFAULT_HAN_REDUNDANCY_EPSILON,
) -> list[dict[str, object]]:
    """Drop MultiLevel tautologies, Han-redundant descendants, and supersets."""
    without_hierarchy = [
        rule
        for rule in rules
        if not _has_hierarchical_cooccurrence(
            list(rule["antecedents"]), definition.hierarchical_pairs
        )
    ]
    without_han = drop_han_redundant_rules(
        without_hierarchy, definition.hierarchical_pairs, epsilon=epsilon
    )
    return deduplicate_redundant_rules(without_han)


def _has_hierarchical_cooccurrence(
    antecedents: list[str], pairs: tuple[tuple[str, str], ...]
) -> bool:
    features = {item.split("=", 1)[0] for item in antecedents}
    return any(ancestor in features and descendant in features for ancestor, descendant in pairs)


def drop_han_redundant_rules(
    rules: list[dict[str, object]],
    hierarchical_pairs: tuple[tuple[str, str], ...],
    *,
    epsilon: float = DEFAULT_HAN_REDUNDANCY_EPSILON,
) -> list[dict[str, object]]:
    """Remove descendant rules whose confidence matches an ancestor within epsilon."""
    if not hierarchical_pairs:
        return list(rules)
    ranked = sorted(
        rules,
        key=lambda rule: (
            str(rule["consequent"]),
            len(list(rule["antecedents"])),
            tuple(rule["antecedents"]),
        ),
    )
    kept: list[dict[str, object]] = []
    for candidate in ranked:
        redundant = False
        for ancestor in kept:
            if ancestor["consequent"] != candidate["consequent"]:
                continue
            if not _is_han_descendant_antecedent(
                list(ancestor["antecedents"]),
                list(candidate["antecedents"]),
                hierarchical_pairs,
            ):
                continue
            if abs(float(candidate["confidence"]) - float(ancestor["confidence"])) <= epsilon:
                redundant = True
                break
        if not redundant:
            kept.append(candidate)
    return sorted(
        kept,
        key=lambda rule: (
            -float(rule["lift"]),
            -float(rule["confidence"]),
            -float(rule["support"]),
            tuple(rule["antecedents"]),
            str(rule["consequent"]),
        ),
    )


def _is_han_descendant_antecedent(
    ancestor_items: list[str],
    descendant_items: list[str],
    hierarchical_pairs: tuple[tuple[str, str], ...],
) -> bool:
    """True when every ancestor item equals or generalizes a distinct descendant item."""
    if len(ancestor_items) != len(descendant_items):
        return False
    if set(ancestor_items) == set(descendant_items):
        return False
    remaining = list(descendant_items)
    for ancestor_item in ancestor_items:
        match_index = None
        for index, descendant_item in enumerate(remaining):
            if _item_equals_or_generalizes(ancestor_item, descendant_item, hierarchical_pairs):
                match_index = index
                break
        if match_index is None:
            return False
        remaining.pop(match_index)
    return True


def _item_equals_or_generalizes(
    ancestor_item: str,
    descendant_item: str,
    hierarchical_pairs: tuple[tuple[str, str], ...],
) -> bool:
    if ancestor_item == descendant_item:
        return True
    ancestor_feature, ancestor_value = ancestor_item.split("=", 1)
    descendant_feature, _descendant_value = descendant_item.split("=", 1)
    for parent, child in hierarchical_pairs:
        if ancestor_feature == parent and descendant_feature == child:
            return True
    return False


def deduplicate_redundant_rules(
    rules: list[dict[str, object]],
) -> list[dict[str, object]]:
    """Remove rules whose antecedents are a strict superset of another with equal metrics."""
    ranked = sorted(
        rules,
        key=lambda rule: (
            str(rule["consequent"]),
            len(list(rule["antecedents"])),
            -float(rule["lift"]),
            -float(rule["confidence"]),
            -float(rule["support"]),
            tuple(rule["antecedents"]),
        ),
    )
    kept: list[dict[str, object]] = []
    for candidate in ranked:
        candidate_antecedents = set(candidate["antecedents"])
        redundant = False
        for kept_rule in kept:
            if kept_rule["consequent"] != candidate["consequent"]:
                continue
            kept_antecedents = set(kept_rule["antecedents"])
            if not kept_antecedents < candidate_antecedents:
                continue
            if (
                kept_rule["support"] == candidate["support"]
                and kept_rule["confidence"] == candidate["confidence"]
                and kept_rule["lift"] == candidate["lift"]
            ):
                redundant = True
                break
        if not redundant:
            kept.append(candidate)
    return sorted(
        kept,
        key=lambda rule: (
            -float(rule["lift"]),
            -float(rule["confidence"]),
            -float(rule["support"]),
            tuple(rule["antecedents"]),
            str(rule["consequent"]),
        ),
    )


def compare_rule_sets(
    rules_by_algorithm: Mapping[str, list[dict[str, object]]]
) -> dict[str, object]:
    consensus = sorted(algorithm for algorithm in rules_by_algorithm if algorithm in CONSENSUS_ALGORITHMS)
    if set(consensus) != CONSENSUS_ALGORITHMS:
        return {"comparison": "not_requested", "present": sorted(rules_by_algorithm)}
    keyed = {
        algorithm: {_rule_key(rule) for rule in rules_by_algorithm[algorithm]}
        for algorithm in consensus
    }
    shared = set.intersection(*(keyed[algorithm] for algorithm in consensus))
    pairwise: dict[str, object] = {}
    for left, right in (("apriori", "fpgrowth"), ("apriori", "eclat"), ("fpgrowth", "eclat")):
        union = keyed[left] | keyed[right]
        pairwise[f"{left}_vs_{right}"] = {
            "shared_rule_count": len(keyed[left] & keyed[right]),
            "jaccard": round(len(keyed[left] & keyed[right]) / len(union), 6) if union else 1.0,
        }
    return {
        "comparison": "apriori_fpgrowth_eclat",
        "rule_counts": {algorithm: len(keyed[algorithm]) for algorithm in consensus},
        "shared_rule_count": len(shared),
        "triple_jaccard": round(
            len(shared) / len(set.union(*(keyed[algorithm] for algorithm in consensus))),
            6,
        )
        if any(keyed.values())
        else 1.0,
        "pairwise": pairwise,
        "hybrid_present": "apriori_hybrid" in rules_by_algorithm,
    }


def write_artifacts(output_dir: Path, manifest: Mapping[str, object], results: Mapping[str, object]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    _write_json(output_dir / "kdd_manifest.json", manifest)
    for population, result in results.items():
        _write_json(output_dir / f"{population}_kdd.json", result)


def _write_json(path: Path, payload: Mapping[str, object]) -> None:
    with tempfile.NamedTemporaryFile(
        "w", encoding="utf-8", dir=path.parent, delete=False
    ) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def _progress(message: str) -> None:
    rss_kb = _rss_kb()
    rss = f" rss_mb={rss_kb / 1024:.1f}" if rss_kb is not None else ""
    print(f"[kdd] {message}{rss}", file=sys.stderr, flush=True)


def _rss_kb() -> int | None:
    try:
        with open("/proc/self/status", encoding="utf-8") as handle:
            for line in handle:
                if line.startswith("VmRSS:"):
                    return int(line.split()[1])
    except OSError:
        return None
    return None


def _table_ref(config: KddConfig, table: str) -> str:
    if not IDENTIFIER.fullmatch(table):
        raise ValueError("table identifier is invalid")
    return f"{config.project}.{config.dataset}.{table}"


def _sanitize_categorical_expr(column: str) -> pl.Expr:
    raw = (
        pl.when(pl.col(column).is_null())
        .then(pl.lit("UNKNOWN"))
        .otherwise(pl.col(column).cast(pl.Utf8).str.strip_chars().str.to_uppercase())
    )
    sanitized = raw.str.replace_all(r"[^A-Z0-9_.-]", "_").str.slice(0, 64)
    return (
        pl.when(sanitized.is_null() | (sanitized == ""))
        .then(pl.lit("UNKNOWN"))
        .otherwise(sanitized)
    )


def _categorical_item(column: str, value: object) -> str:
    normalized = "UNKNOWN" if pd.isna(value) else str(value).strip().upper()
    sanitized = re.sub(r"[^A-Z0-9_.-]", "_", normalized)[:64] or "UNKNOWN"
    return f"{column}={sanitized}"


def _boolean_item(column: str, value: object) -> str:
    if pd.isna(value):
        return f"{column}=UNKNOWN"
    return f"{column}={'TRUE' if bool(value) else 'FALSE'}"


def _numeric_bounds(population: pd.Series) -> tuple[float, float, float] | None:
    values = pd.to_numeric(population, errors="coerce").dropna().abs()
    if values.empty:
        return None
    return tuple(float(values.quantile(level)) for level in (0.50, 0.90, 0.99))


def _numeric_bounds_polars(population: pl.Series) -> tuple[float, float, float] | None:
    values = population.cast(pl.Float64, strict=False).drop_nulls().abs()
    if values.is_empty():
        return None
    return tuple(float(values.quantile(level)) for level in (0.50, 0.90, 0.99))


def _numeric_item_expressions(
    column: str,
    bounds: tuple[float, float, float] | None,
    *,
    emit_non_negative_sign: bool = True,
) -> list[pl.Expr]:
    numeric = pl.col(column).cast(pl.Float64, strict=False)
    missing = numeric.is_null()
    expressions: list[pl.Expr] = [missing.alias(f"{column}=MISSING")]
    if bounds is None:
        expressions.append((~missing).alias(f"{column}=PRESENT"))
        return expressions
    q50, q90, q99 = bounds
    absolute = numeric.abs()
    bucket = (
        pl.when(missing)
        .then(pl.lit(None, dtype=pl.Utf8))
        .when(absolute <= q50)
        .then(pl.lit("LOW"))
        .when(absolute <= q90)
        .then(pl.lit("MEDIUM"))
        .when(absolute <= q99)
        .then(pl.lit("HIGH"))
        .otherwise(pl.lit("EXTREME"))
    )
    for label in ("LOW", "MEDIUM", "HIGH", "EXTREME"):
        expressions.append(
            (bucket == label).fill_null(False).alias(f"{column}_bucket={label}")
        )
    expressions.append(((~missing) & (numeric < 0)).alias(f"{column}_sign=NEGATIVE"))
    if emit_non_negative_sign:
        expressions.append(
            ((~missing) & (numeric >= 0)).alias(f"{column}_sign=NON_NEGATIVE")
        )
    return expressions


def _numeric_items(
    column: str,
    value: object,
    bounds: tuple[float, float, float] | None,
    *,
    emit_non_negative_sign: bool = True,
) -> list[str]:
    numeric = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(numeric):
        return [f"{column}=MISSING"]
    absolute = abs(float(numeric))
    if bounds is None:
        return [f"{column}=PRESENT"]
    q50, q90, q99 = bounds
    bucket = (
        "LOW"
        if absolute <= q50
        else "MEDIUM"
        if absolute <= q90
        else "HIGH"
        if absolute <= q99
        else "EXTREME"
    )
    items = [f"{column}_bucket={bucket}"]
    if float(numeric) < 0:
        items.append(f"{column}_sign=NEGATIVE")
    elif emit_non_negative_sign:
        items.append(f"{column}_sign=NON_NEGATIVE")
    return items


def _rule_key(rule: Mapping[str, object]) -> tuple[tuple[str, ...], str]:
    return tuple(rule["antecedents"]), str(rule["consequent"])


def _hash_json(value: object) -> str:
    return hashlib.sha256(json.dumps(value, default=str, sort_keys=True).encode("utf-8")).hexdigest()


def _require_string(settings: Mapping[str, object], key: str) -> str:
    value = settings.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"kdd.{key} must be a non-empty string")
    return value


def _require_string_list(settings: Mapping[str, object], key: str) -> Iterable[str]:
    value = settings.get(key)
    if not isinstance(value, list) or not all(isinstance(item, str) for item in value):
        raise ValueError(f"kdd.{key} must be a string list")
    return value


def _require_positive_int(settings: Mapping[str, object], key: str) -> int:
    value = settings.get(key)
    if not isinstance(value, int) or value <= 0:
        raise ValueError(f"kdd.{key} must be a positive integer")
    return value


def _require_positive_float(settings: Mapping[str, object], key: str) -> float:
    value = settings.get(key)
    if not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"kdd.{key} must be positive")
    return float(value)


def _require_probability(settings: Mapping[str, object], key: str) -> float:
    value = _require_positive_float(settings, key)
    if value > 1:
        raise ValueError(f"kdd.{key} must be <= 1")
    return value


def _parse_timestamp(value: str) -> datetime:
    parsed = datetime.fromisoformat(value)
    if parsed.tzinfo is None:
        raise ValueError("timestamps must include a timezone")
    return parsed
