"""Offline C2 quantile baseline for transaction-complaint resolution duration."""

from __future__ import annotations

import hashlib
import json
import re
import tempfile
import tomllib
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

import pandas as pd


IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,1023}$")
PROJECT_ID = re.compile(r"^[a-z][a-z0-9-]{4,61}[a-z0-9]$")
RUN_ID = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
TABLE = "complaints"
TARGET = "resolution_days"
TERMINAL_STATUSES = ("Resolved", "Closed")
FEATURES = ("priority", "reception_channel")
SELECTED_COLUMNS = (*FEATURES, TARGET)
REQUIRED_TYPES = {
    "complaint_id": ("STRING",),
    "creation_date": ("TIMESTAMP", "DATETIME"),
    "category": ("STRING",),
    "status": ("STRING",),
    "priority": ("STRING",),
    "reception_channel": ("STRING",),
    TARGET: ("FLOAT", "FLOAT64", "NUMERIC", "INTEGER", "INT64"),
}


@dataclass(frozen=True)
class C2Split:
    name: str
    start_timestamp: datetime
    end_timestamp: datetime
    sample_size: int


@dataclass(frozen=True)
class C2Config:
    project: str
    dataset: str
    output_dir: Path
    category: str
    maximum_bytes_billed: int
    min_segment_rows: int
    train: C2Split
    calibration: C2Split
    test: C2Split


class BigQueryC2Client(Protocol):
    def get_table(self, table: str) -> Any: ...

    def query(self, query: str, job_config: Any) -> Any: ...


def load_config(path: Path) -> C2Config:
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    settings = _mapping(data, "c2")
    project, dataset = _string(settings, "project"), _string(settings, "dataset")
    if not PROJECT_ID.fullmatch(project) or not IDENTIFIER.fullmatch(dataset):
        raise ValueError("project or dataset identifier is invalid")
    config = C2Config(
        project=project,
        dataset=dataset,
        output_dir=Path(_string(settings, "output_dir")),
        category=_string(settings, "category"),
        maximum_bytes_billed=_positive_int(settings, "maximum_bytes_billed"),
        min_segment_rows=_positive_int(settings, "min_segment_rows"),
        train=_split(settings, "train"),
        calibration=_split(settings, "calibration"),
        test=_split(settings, "test"),
    )
    _validate_splits(config)
    return config


def dry_run_plan(config: C2Config) -> dict[str, object]:
    return {
        "case": "C2",
        "table": f"{config.dataset}.{TABLE}",
        "category": config.category,
        "terminal_statuses": list(TERMINAL_STATUSES),
        "target": TARGET,
        "features": list(FEATURES),
        "leakage_exclusions": ["complaint_id", "customer_id", "status", "resolution_date", "closing_date", "resolution", "compensation_granted", "resolution_satisfaction", "description", "transcript"],
        "splits": [_split_payload(split) for split in (config.train, config.calibration, config.test)],
        "estimator": "hierarchical_p50_p90_cohort",
        "publication": "not_requested",
    }


class ResolutionQuantileBaseline:
    """P50/P90 baseline with deterministic cohort fallbacks."""

    def __init__(self, min_segment_rows: int) -> None:
        self.min_segment_rows = min_segment_rows
        self.global_quantiles: tuple[float, float] | None = None
        self.priority_quantiles: dict[str, tuple[float, float]] = {}
        self.priority_channel_quantiles: dict[tuple[str, str], tuple[float, float]] = {}

    def fit(self, frame: pd.DataFrame) -> "ResolutionQuantileBaseline":
        if frame.empty or frame[TARGET].isna().any():
            raise ValueError("C2 training frame requires a non-null resolution_days target")
        self.global_quantiles = _quantiles(frame[TARGET])
        prepared = _prepared(frame)
        self.priority_quantiles = {
            priority: _quantiles(group[TARGET])
            for priority, group in prepared.groupby("priority", dropna=False)
            if len(group) >= self.min_segment_rows
        }
        self.priority_channel_quantiles = {
            (priority, channel): _quantiles(group[TARGET])
            for (priority, channel), group in prepared.groupby(["priority", "reception_channel"], dropna=False)
            if len(group) >= self.min_segment_rows
        }
        return self

    def predict(self, frame: pd.DataFrame) -> list[dict[str, object]]:
        if self.global_quantiles is None:
            raise ValueError("C2 baseline has not been fitted")
        output = []
        for _, row in _prepared(frame).iterrows():
            key = (row["priority"], row["reception_channel"])
            if key in self.priority_channel_quantiles:
                values, level = self.priority_channel_quantiles[key], "priority_channel"
            elif row["priority"] in self.priority_quantiles:
                values, level = self.priority_quantiles[row["priority"]], "priority"
            else:
                values, level = self.global_quantiles, "global"
            output.append({"p50": values[0], "p90": values[1], "cohort_level": level})
        return output

    def payload(self) -> dict[str, object]:
        if self.global_quantiles is None:
            raise ValueError("C2 baseline has not been fitted")
        return {
            "algorithm": "hierarchical_p50_p90_cohort",
            "features": list(FEATURES),
            "min_segment_rows": self.min_segment_rows,
            "global": _quantile_payload(self.global_quantiles),
            "priority": {key: _quantile_payload(value) for key, value in sorted(self.priority_quantiles.items())},
            "priority_channel": {f"{key[0]}|{key[1]}": _quantile_payload(value) for key, value in sorted(self.priority_channel_quantiles.items())},
        }


def run_c2(config: C2Config, run_id: str, client: BigQueryC2Client) -> dict[str, object]:
    if not RUN_ID.fullmatch(run_id):
        raise ValueError("run_id must be opaque and match the allowed format")
    _assert_schema(client, config)
    frames: dict[str, pd.DataFrame] = {}
    lineage: list[dict[str, object]] = []
    for split in (config.train, config.calibration, config.test):
        frame, source = _read_split(client, config, split)
        if len(frame) != split.sample_size:
            raise ValueError(f"C2 {split.name} sample is incomplete")
        frames[split.name] = frame
        lineage.append(source)
    baseline = ResolutionQuantileBaseline(config.min_segment_rows).fit(frames["train"])
    global_baseline = ResolutionQuantileBaseline(len(frames["train"]) + 1).fit(frames["train"])
    calibration = _evaluate(baseline.predict(frames["calibration"]), frames["calibration"])
    test = _evaluate(baseline.predict(frames["test"]), frames["test"])
    manifest = {
        "schema_version": "bankai-c2-resolution-v1",
        "run_id": run_id,
        "case": "C2",
        "config_hash": _hash_json(asdict(config)),
        "lineage": lineage,
        "target": TARGET,
        "feature_contract": {"features": list(FEATURES), "terminal_statuses": list(TERMINAL_STATUSES), "min_segment_rows": config.min_segment_rows},
        "leakage_exclusions": dry_run_plan(config)["leakage_exclusions"],
        "evaluation": {"segmented": {"calibration": calibration, "test": test}, "global": {"calibration": _evaluate(global_baseline.predict(frames["calibration"]), frames["calibration"]), "test": _evaluate(global_baseline.predict(frames["test"]), frames["test"])}},
        "publication": "not_requested",
    }
    _write_artifacts(config.output_dir / run_id, manifest, baseline)
    return manifest


def _assert_schema(client: BigQueryC2Client, config: C2Config) -> None:
    actual = {field.name: field.field_type.upper() for field in client.get_table(_table_ref(config)).schema}
    missing = sorted(name for name in REQUIRED_TYPES if name not in actual)
    invalid = sorted(name for name, types in REQUIRED_TYPES.items() if name in actual and actual[name] not in types)
    if missing or invalid:
        raise ValueError(f"C2 schema rejected complaints: missing={missing} unexpected_types={invalid}")


def _read_split(client: BigQueryC2Client, config: C2Config, split: C2Split) -> tuple[pd.DataFrame, dict[str, object]]:
    from google.cloud import bigquery

    columns = ", ".join(f"`{column}`" for column in SELECTED_COLUMNS)
    query = f"""
WITH sampled AS (
  SELECT {columns}
  FROM `{_table_ref(config)}`
  WHERE `category` = @category
    AND `status` IN UNNEST(@terminal_statuses)
    AND `{TARGET}` IS NOT NULL
    AND `creation_date` >= @start_timestamp
    AND `creation_date` < @end_timestamp
  ORDER BY FARM_FINGERPRINT(CAST(`complaint_id` AS STRING))
  LIMIT @sample_size
)
SELECT {columns}
FROM sampled
""".strip()
    parameters = [
        bigquery.ScalarQueryParameter("category", "STRING", config.category),
        bigquery.ArrayQueryParameter("terminal_statuses", "STRING", list(TERMINAL_STATUSES)),
        bigquery.ScalarQueryParameter("start_timestamp", "TIMESTAMP", split.start_timestamp),
        bigquery.ScalarQueryParameter("end_timestamp", "TIMESTAMP", split.end_timestamp),
        bigquery.ScalarQueryParameter("sample_size", "INT64", split.sample_size),
    ]
    job = client.query(query, job_config=bigquery.QueryJobConfig(query_parameters=parameters, maximum_bytes_billed=config.maximum_bytes_billed, use_query_cache=False, labels={"component": "c2", "operation": f"c2-{split.name}-sample"[:63]}))
    frame = pd.DataFrame([dict(row) for row in job.result()], columns=SELECTED_COLUMNS)
    return frame, {"split": split.name, "table": f"{config.dataset}.{TABLE}", "query_hash": hashlib.sha256(query.encode("utf-8")).hexdigest(), "job_id": job.job_id, "total_bytes_processed": int(job.total_bytes_processed or 0), "row_count": int(len(frame))}


def _prepared(frame: pd.DataFrame) -> pd.DataFrame:
    prepared = frame.loc[:, [*FEATURES, TARGET]].copy()
    for feature in FEATURES:
        prepared[feature] = prepared[feature].fillna("UNKNOWN").astype(str).str.strip().str.upper().str.replace(r"[^A-Z0-9_.-]", "_", regex=True).str.slice(0, 64).replace("", "UNKNOWN")
    prepared[TARGET] = pd.to_numeric(prepared[TARGET], errors="raise")
    return prepared


def _quantiles(values: pd.Series) -> tuple[float, float]:
    return (round(float(values.quantile(0.5)), 6), round(float(values.quantile(0.9)), 6))


def _quantile_payload(values: tuple[float, float]) -> dict[str, float]:
    return {"p50": values[0], "p90": values[1]}


def _evaluate(predictions: list[dict[str, object]], frame: pd.DataFrame) -> dict[str, object]:
    actual = pd.to_numeric(frame[TARGET], errors="raise").tolist()
    p50 = [float(item["p50"]) for item in predictions]
    p90 = [float(item["p90"]) for item in predictions]
    levels = pd.Series([str(item["cohort_level"]) for item in predictions]).value_counts().sort_index().to_dict()
    return {
        "row_count": len(actual),
        "mae_against_p50": round(sum(abs(value - prediction) for value, prediction in zip(actual, p50, strict=True)) / len(actual), 6),
        "p50_empirical_coverage": round(sum(value <= prediction for value, prediction in zip(actual, p50, strict=True)) / len(actual), 6),
        "p90_empirical_coverage": round(sum(value <= prediction for value, prediction in zip(actual, p90, strict=True)) / len(actual), 6),
        "actual_p50": _quantiles(pd.Series(actual))[0],
        "actual_p90": _quantiles(pd.Series(actual))[1],
        "cohort_level_counts": {str(key): int(value) for key, value in levels.items()},
        "decision_threshold": "not_applicable",
    }


def _write_artifacts(destination: Path, manifest: Mapping[str, object], baseline: ResolutionQuantileBaseline) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    _write_json(destination / "c2-manifest.json", manifest)
    _write_json(destination / "c2-quantile-baseline.json", baseline.payload())


def _write_json(path: Path, payload: Mapping[str, object]) -> None:
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def _table_ref(config: C2Config) -> str:
    return f"{config.project}.{config.dataset}.{TABLE}"


def _validate_splits(config: C2Config) -> None:
    splits = (config.train, config.calibration, config.test)
    if any(split.end_timestamp <= split.start_timestamp for split in splits):
        raise ValueError("C2 split end_timestamp must be after start_timestamp")
    if not (config.train.end_timestamp <= config.calibration.start_timestamp <= config.calibration.end_timestamp <= config.test.start_timestamp <= config.test.end_timestamp):
        raise ValueError("C2 splits must be ordered and non-overlapping")
    if sum(split.sample_size for split in splits) != 2_450:
        raise ValueError("C2 pilot must use exactly 2450 rows")


def _split(settings: Mapping[str, object], name: str) -> C2Split:
    data = _mapping(settings, name)
    return C2Split(name, _timestamp(data, "start_timestamp"), _timestamp(data, "end_timestamp"), _positive_int(data, "sample_size"))


def _split_payload(split: C2Split) -> dict[str, object]:
    return {"name": split.name, "start": split.start_timestamp.isoformat(), "end": split.end_timestamp.isoformat(), "sample_size": split.sample_size}


def _hash_json(value: object) -> str:
    return hashlib.sha256(json.dumps(value, default=str, sort_keys=True).encode("utf-8")).hexdigest()


def _mapping(data: Mapping[str, object], key: str) -> Mapping[str, object]:
    value = data.get(key)
    if not isinstance(value, Mapping):
        raise ValueError(f"{key} TOML section is required")
    return value


def _string(data: Mapping[str, object], key: str) -> str:
    value = data.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"{key} must be a non-empty string")
    return value


def _positive_int(data: Mapping[str, object], key: str) -> int:
    value = data.get(key)
    if not isinstance(value, int) or value <= 0:
        raise ValueError(f"{key} must be a positive integer")
    return value


def _timestamp(data: Mapping[str, object], key: str) -> datetime:
    parsed = datetime.fromisoformat(_string(data, key).replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError(f"{key} must include a timezone")
    return parsed
