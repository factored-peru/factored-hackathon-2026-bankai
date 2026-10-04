"""Reproducible, read-only KDD for transaction issue and dispute triage."""

from __future__ import annotations

import hashlib
import json
import re
import tempfile
import tomllib
import warnings
from collections.abc import Iterable, Mapping
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

import pandas as pd

from bankai_pipeline.data_understanding import profile_frame
from bankai_pipeline.dispute_contracts import TableContract, validate_schema


IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,1023}$")
PROJECT_ID = re.compile(r"^[a-z][a-z0-9-]{4,61}[a-z0-9]$")
RUN_ID = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
ALGORITHMS = frozenset({"apriori", "fpgrowth"})


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
        raise ValueError("algorithms must contain apriori and/or fpgrowth")
    max_rows = _require_positive_int(settings, "max_rows")
    if len(algorithms) > 1 and max_rows > 100_000:
        raise ValueError("both algorithms require max_rows <= 100000")
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
        "graph_compilation": "not_requested",
    }


def run_kdd(config: KddConfig, run_id: str, client: BigQueryKddClient) -> dict[str, object]:
    if not RUN_ID.fullmatch(run_id):
        raise ValueError("run_id must be opaque and match the allowed format")
    results: dict[str, object] = {}
    lineage: list[dict[str, object]] = []
    for definition in population_definitions():
        _assert_contract(client, config, definition)
        frame, source = _read_population(client, config, definition)
        profile = profile_frame(
            frame,
            primary_key=definition.primary_key,
            numeric_columns=definition.numeric_columns,
            categorical_columns=(definition.target_column, *definition.categorical_columns),
        )
        matrix, feature_catalog = build_item_matrix(frame, definition, config)
        rules_by_algorithm = {
            algorithm: refine_mined_rules(
                mine_rules(matrix, definition.target_column, algorithm, config),
                definition,
            )
            for algorithm in config.algorithms
        }
        results[definition.name] = {
            "quality_profile": profile,
            "feature_catalog": feature_catalog,
            "rules": rules_by_algorithm,
            "comparison": compare_rule_sets(rules_by_algorithm),
        }
        lineage.append(source)
    manifest = {
        "run_id": run_id,
        "kdd_version": "v1",
        "config_hash": _hash_json(asdict(config)),
        "lineage": lineage,
        "populations": list(results),
        "graph_compilation": "not_requested",
    }
    write_artifacts(config.output_dir / run_id, manifest, results)
    return manifest


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
) -> tuple[pd.DataFrame, dict[str, object]]:
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
    frame = job.result().to_dataframe()
    return frame, {
        "population": definition.name,
        "table": f"{config.dataset}.{definition.table}",
        "query_id": f"kdd_{definition.name}_v1",
        "query_hash": hashlib.sha256(query.encode("utf-8")).hexdigest(),
        "job_id": job.job_id,
        "total_bytes_processed": int(job.total_bytes_processed or 0),
        "row_count": int(len(frame)),
    }


def build_item_matrix(
    frame: pd.DataFrame, definition: PopulationDefinition, config: KddConfig
) -> tuple[pd.DataFrame, dict[str, object]]:
    items: list[list[str]] = []
    catalog: dict[str, object] = {"target": definition.target_column, "features": []}
    categorical = (definition.target_column, *definition.categorical_columns)
    permitted = [definition.target_column]
    permitted.extend(
        column
        for column in definition.categorical_columns
        if frame[column].nunique(dropna=True) <= config.max_categorical_cardinality
    )
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
    numeric_bounds = {
        column: _numeric_bounds(frame[column]) for column in numeric_columns
    }
    for _, row in frame.iterrows():
        record = [_categorical_item(column, row[column]) for column in permitted]
        for column in boolean_columns:
            record.append(_boolean_item(column, row[column]))
        for column in numeric_columns:
            record.extend(
                _numeric_items(
                    column,
                    row[column],
                    numeric_bounds[column],
                    emit_non_negative_sign=column
                    not in definition.non_negative_numeric_columns,
                )
            )
        items.append(record)
    from mlxtend.preprocessing import TransactionEncoder

    encoder = TransactionEncoder()
    matrix = pd.DataFrame(encoder.fit(items).transform(items), columns=encoder.columns_)
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
    if matrix.empty:
        return []
    from mlxtend.frequent_patterns import apriori, association_rules, fpgrowth

    miner = apriori if algorithm == "apriori" else fpgrowth
    itemsets = miner(
        matrix,
        min_support=config.min_support,
        use_colnames=True,
        max_len=config.max_itemset_length,
    )
    if itemsets.empty:
        return []
    with warnings.catch_warnings():
        warnings.simplefilter("ignore", RuntimeWarning)
        rules = association_rules(
            itemsets,
            metric="confidence",
            min_threshold=config.min_confidence,
        )
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


def refine_mined_rules(
    rules: list[dict[str, object]], definition: PopulationDefinition
) -> list[dict[str, object]]:
    """Drop MultiLevel tautologies and strict-superset redundant rules."""
    without_hierarchy = [
        rule
        for rule in rules
        if not _has_hierarchical_cooccurrence(
            list(rule["antecedents"]), definition.hierarchical_pairs
        )
    ]
    return deduplicate_redundant_rules(without_hierarchy)


def _has_hierarchical_cooccurrence(
    antecedents: list[str], pairs: tuple[tuple[str, str], ...]
) -> bool:
    features = {item.split("=", 1)[0] for item in antecedents}
    return any(ancestor in features and descendant in features for ancestor, descendant in pairs)


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
    if set(rules_by_algorithm) != {"apriori", "fpgrowth"}:
        return {"comparison": "not_requested"}
    left = {_rule_key(rule) for rule in rules_by_algorithm["apriori"]}
    right = {_rule_key(rule) for rule in rules_by_algorithm["fpgrowth"]}
    union = left | right
    return {
        "comparison": "apriori_vs_fpgrowth",
        "apriori_rule_count": len(left),
        "fpgrowth_rule_count": len(right),
        "shared_rule_count": len(left & right),
        "jaccard": round(len(left & right) / len(union), 6) if union else 1.0,
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


def _table_ref(config: KddConfig, table: str) -> str:
    if not IDENTIFIER.fullmatch(table):
        raise ValueError("table identifier is invalid")
    return f"{config.project}.{config.dataset}.{table}"


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
