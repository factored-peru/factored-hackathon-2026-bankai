"""Offline, PII-safe C1 baseline for transaction-complaint SLA risk.

This module adapts the categorical, Laplace-smoothed Naive Bayes approach used
in the FuTour reference.  It deliberately remains an offline experiment: it
does not emit per-complaint scores, make decisions, or publish artifacts.
"""

from __future__ import annotations

import hashlib
import json
import math
import re
import tempfile
import tomllib
from collections import Counter, defaultdict
from collections.abc import Mapping
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Any, Protocol

import pandas as pd


IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,1023}$")
PROJECT_ID = re.compile(r"^[a-z][a-z0-9-]{4,61}[a-z0-9]$")
RUN_ID = re.compile(r"^[A-Za-z0-9_-]{8,80}$")
TARGET = "sla_breached"
TABLE = "complaints"
CATEGORY = "Transactions"
CATEGORICAL_FEATURES = (
    "case_type",
    "category",
    "subcategory",
    "reception_channel",
    "priority",
    "currency",
    "is_repeat_complainer",
)
SELECTED_COLUMNS = ("creation_date", *CATEGORICAL_FEATURES, "claimed_amount", TARGET)
REQUIRED_TYPES = {
    "complaint_id": ("STRING",),
    "creation_date": ("TIMESTAMP", "DATETIME"),
    "case_type": ("STRING",),
    "category": ("STRING",),
    "subcategory": ("STRING",),
    "reception_channel": ("STRING",),
    "priority": ("STRING",),
    "currency": ("STRING",),
    "is_repeat_complainer": ("BOOLEAN",),
    "claimed_amount": ("FLOAT", "FLOAT64", "NUMERIC", "INTEGER", "INT64"),
    TARGET: ("BOOLEAN",),
}


@dataclass(frozen=True)
class C1Split:
    name: str
    start_timestamp: datetime
    end_timestamp: datetime
    sample_size: int


@dataclass(frozen=True)
class C1Config:
    project: str
    dataset: str
    output_dir: Path
    category: str
    maximum_bytes_billed: int
    max_categorical_cardinality: int
    alpha: float
    train: C1Split
    calibration: C1Split
    test: C1Split


class BigQueryC1Client(Protocol):
    def get_table(self, table: str) -> Any: ...

    def query(self, query: str, job_config: Any) -> Any: ...


def load_config(path: Path) -> C1Config:
    data = tomllib.loads(path.read_text(encoding="utf-8"))
    settings = _mapping(data, "c1")
    project = _string(settings, "project")
    dataset = _string(settings, "dataset")
    if not PROJECT_ID.fullmatch(project) or not IDENTIFIER.fullmatch(dataset):
        raise ValueError("project or dataset identifier is invalid")
    config = C1Config(
        project=project,
        dataset=dataset,
        output_dir=Path(_string(settings, "output_dir")),
        category=_string(settings, "category"),
        maximum_bytes_billed=_positive_int(settings, "maximum_bytes_billed"),
        max_categorical_cardinality=_positive_int(settings, "max_categorical_cardinality"),
        alpha=_positive_float(settings, "alpha"),
        train=_split(settings, "train"),
        calibration=_split(settings, "calibration"),
        test=_split(settings, "test"),
    )
    _validate_splits(config)
    return config


def dry_run_plan(config: C1Config) -> dict[str, object]:
    return {
        "case": "C1",
        "table": f"{config.dataset}.{TABLE}",
        "category": config.category,
        "target": TARGET,
        "features": list(CATEGORICAL_FEATURES) + ["claimed_amount_bucket", "creation_month", "creation_weekday"],
        "leakage_exclusions": ["complaint_id", "customer_id", "status", "resolution_days", "resolution_date", "closing_date", "resolution", "compensation_granted", "resolution_satisfaction", "description", "transcript"],
        "splits": [_split_payload(split) for split in (config.train, config.calibration, config.test)],
        "calibration": "platt_sigmoid",
        "publication": "not_requested",
    }


class SmoothedCategoricalNaiveBayes:
    """Binary categorical NB copied in spirit from FuTour and adapted to C1."""

    def __init__(self, alpha: float) -> None:
        self.alpha = alpha
        self.totals: Counter[bool] = Counter()
        self.counts: dict[bool, Counter[str]] = defaultdict(Counter)
        self.domains: dict[str, set[str]] = defaultdict(set)

    def fit(self, records: list[dict[str, str]], labels: list[bool]) -> "SmoothedCategoricalNaiveBayes":
        if len(records) != len(labels) or not records:
            raise ValueError("C1 training records and labels must be non-empty and aligned")
        self.totals.clear()
        self.counts.clear()
        self.domains.clear()
        for record, label in zip(records, labels, strict=True):
            normalized_label = bool(label)
            self.totals[normalized_label] += 1
            for feature, value in record.items():
                self.domains[feature].add(value)
                self.counts[normalized_label][f"{feature}:{value}"] += 1
        if set(self.totals) != {False, True}:
            raise ValueError("C1 training split must contain both SLA classes")
        return self

    def probability(self, record: Mapping[str, str]) -> float:
        if not self.totals:
            raise ValueError("C1 model has not been fitted")
        scores: dict[bool, float] = {}
        total = sum(self.totals.values())
        for label in (False, True):
            score = math.log((self.totals[label] + self.alpha) / (total + self.alpha * 2))
            for feature, value in record.items():
                if value not in self.domains.get(feature, set()):
                    continue
                cardinality = len(self.domains[feature])
                score += math.log(
                    (self.counts[label][f"{feature}:{value}"] + self.alpha)
                    / (self.totals[label] + self.alpha * cardinality)
                )
            scores[label] = score
        peak = max(scores.values())
        weights = {label: math.exp(score - peak) for label, score in scores.items()}
        return weights[True] / sum(weights.values())

    def payload(self) -> dict[str, object]:
        return {
            "algorithm": "categorical_naive_bayes_laplace",
            "alpha": self.alpha,
            "class_counts": {str(label).lower(): self.totals[label] for label in (False, True)},
            "domains": {feature: sorted(values) for feature, values in sorted(self.domains.items())},
            "conditional_counts": {
                str(label).lower(): dict(sorted(counts.items())) for label, counts in sorted(self.counts.items())
            },
        }


@dataclass(frozen=True)
class PlattCalibrator:
    coefficient: float
    intercept: float

    def transform(self, probability: float) -> float:
        raw = _logit(probability)
        return 1.0 / (1.0 + math.exp(-(self.coefficient * raw + self.intercept)))


def run_c1(config: C1Config, run_id: str, client: BigQueryC1Client) -> dict[str, object]:
    if not RUN_ID.fullmatch(run_id):
        raise ValueError("run_id must be opaque and match the allowed format")
    _assert_schema(client, config)
    frames: dict[str, pd.DataFrame] = {}
    lineage: list[dict[str, object]] = []
    for split in (config.train, config.calibration, config.test):
        frame, source = _read_split(client, config, split)
        if len(frame) != split.sample_size:
            raise ValueError(f"C1 {split.name} sample is incomplete")
        frames[split.name] = frame
        lineage.append(source)
    transformer = C1FeatureTransformer(config.max_categorical_cardinality).fit(frames["train"])
    train_records, train_labels = transformer.transform(frames["train"])
    calibration_records, calibration_labels = transformer.transform(frames["calibration"])
    test_records, test_labels = transformer.transform(frames["test"])
    model = SmoothedCategoricalNaiveBayes(config.alpha).fit(train_records, train_labels)
    calibrator = _fit_calibrator([model.probability(record) for record in calibration_records], calibration_labels)
    metrics = _evaluate(
        [calibrator.transform(model.probability(record)) for record in test_records], test_labels
    )
    prevalence = sum(train_labels) / len(train_labels)
    metrics["prevalence_baseline"] = {
        "probability": round(prevalence, 6),
        "pr_auc": round(prevalence, 6),
        "brier_score": round(sum((float(label) - prevalence) ** 2 for label in test_labels) / len(test_labels), 6),
    }
    manifest = {
        "schema_version": "bankai-c1-sla-v1",
        "run_id": run_id,
        "case": "C1",
        "config_hash": _hash_json(asdict(config)),
        "lineage": lineage,
        "target": TARGET,
        "feature_contract": transformer.payload(),
        "leakage_exclusions": dry_run_plan(config)["leakage_exclusions"],
        "training": {"algorithm": "categorical_naive_bayes_laplace", "alpha": config.alpha, "calibration": "platt_sigmoid"},
        "metrics": metrics,
        "publication": "not_requested",
    }
    _write_artifacts(config.output_dir / run_id, manifest, model, calibrator)
    return manifest


class C1FeatureTransformer:
    def __init__(self, max_categorical_cardinality: int) -> None:
        self.max_categorical_cardinality = max_categorical_cardinality
        self.amount_bounds: tuple[float, float, float] | None = None
        self.domains: dict[str, set[str]] = {}

    def fit(self, frame: pd.DataFrame) -> "C1FeatureTransformer":
        self.amount_bounds = _amount_bounds(frame["claimed_amount"])
        records, _ = self._transform(frame)
        self.domains = {feature: {record[feature] for record in records} for feature in records[0]}
        high = sorted(feature for feature, values in self.domains.items() if len(values) > self.max_categorical_cardinality)
        if high:
            raise ValueError(f"C1 feature cardinality exceeds limit: {high}")
        return self

    def transform(self, frame: pd.DataFrame) -> tuple[list[dict[str, str]], list[bool]]:
        if not self.domains:
            raise ValueError("C1 transformer has not been fitted")
        records, labels = self._transform(frame)
        return records, labels

    def payload(self) -> dict[str, object]:
        return {
            "features": sorted(self.domains),
            "amount_bounds": list(self.amount_bounds) if self.amount_bounds else None,
            "max_categorical_cardinality": self.max_categorical_cardinality,
        }

    def _transform(self, frame: pd.DataFrame) -> tuple[list[dict[str, str]], list[bool]]:
        records: list[dict[str, str]] = []
        labels: list[bool] = []
        for _, row in frame.iterrows():
            timestamp = pd.Timestamp(row["creation_date"])
            record = {feature: _item(feature, row[feature]) for feature in CATEGORICAL_FEATURES}
            record["claimed_amount_bucket"] = _amount_bucket(row["claimed_amount"], self.amount_bounds)
            record["creation_month"] = f"M{timestamp.month:02d}"
            record["creation_weekday"] = f"D{timestamp.weekday()}"
            records.append(record)
            labels.append(bool(row[TARGET]))
        return records, labels


def _assert_schema(client: BigQueryC1Client, config: C1Config) -> None:
    table = client.get_table(_table_ref(config))
    actual = {field.name: field.field_type.upper() for field in table.schema}
    missing = sorted(name for name in REQUIRED_TYPES if name not in actual)
    invalid = sorted(name for name, types in REQUIRED_TYPES.items() if name in actual and actual[name] not in types)
    if missing or invalid:
        raise ValueError(f"C1 schema rejected complaints: missing={missing} unexpected_types={invalid}")


def _read_split(client: BigQueryC1Client, config: C1Config, split: C1Split) -> tuple[pd.DataFrame, dict[str, object]]:
    from google.cloud import bigquery

    counts_query = f"""
SELECT `{TARGET}` AS label, COUNT(*) AS row_count
FROM `{_table_ref(config)}`
WHERE UPPER(`category`) = UPPER(@category)
  AND `creation_date` >= @start_timestamp
  AND `creation_date` < @end_timestamp
  AND `{TARGET}` IS NOT NULL
GROUP BY label
""".strip()
    parameters = [
        bigquery.ScalarQueryParameter("category", "STRING", config.category),
        bigquery.ScalarQueryParameter("start_timestamp", "TIMESTAMP", split.start_timestamp),
        bigquery.ScalarQueryParameter("end_timestamp", "TIMESTAMP", split.end_timestamp),
    ]
    count_job = client.query(counts_query, job_config=_job_config(config, parameters, f"c1-{split.name}-counts"))
    counts = {bool(row["label"]): int(row["row_count"]) for row in count_job.result()}
    positive, negative = _stratified_quotas(split.sample_size, counts.get(True, 0), counts.get(False, 0))
    columns = ", ".join(f"`{column}`" for column in SELECTED_COLUMNS)
    sample_query = f"""
WITH eligible AS (
  SELECT {columns},
    ROW_NUMBER() OVER (
      PARTITION BY `{TARGET}`
      ORDER BY FARM_FINGERPRINT(CAST(`complaint_id` AS STRING))
    ) AS sample_rank
  FROM `{_table_ref(config)}`
  WHERE UPPER(`category`) = UPPER(@category)
    AND `creation_date` >= @start_timestamp
    AND `creation_date` < @end_timestamp
    AND `{TARGET}` IS NOT NULL
)
SELECT {columns}
FROM eligible
WHERE (`{TARGET}` IS TRUE AND sample_rank <= @positive_limit)
   OR (`{TARGET}` IS FALSE AND sample_rank <= @negative_limit)
ORDER BY `creation_date`
""".strip()
    sample_parameters = [
        *parameters,
        bigquery.ScalarQueryParameter("positive_limit", "INT64", positive),
        bigquery.ScalarQueryParameter("negative_limit", "INT64", negative),
    ]
    job = client.query(sample_query, job_config=_job_config(config, sample_parameters, f"c1-{split.name}-sample"))
    # Avoid BigQuery's optional db-dtypes dependency: the bounded query returns
    # only the approved C1 columns and is converted row-by-row in memory.
    frame = pd.DataFrame([dict(row) for row in job.result()], columns=SELECTED_COLUMNS)
    return frame, {
        "split": split.name,
        "table": f"{config.dataset}.{TABLE}",
        "query_hash": hashlib.sha256(sample_query.encode("utf-8")).hexdigest(),
        "count_query_hash": hashlib.sha256(counts_query.encode("utf-8")).hexdigest(),
        "job_id": job.job_id,
        "total_bytes_processed": int(job.total_bytes_processed or 0),
        "row_count": int(len(frame)),
        "class_counts": {"false": negative, "true": positive},
    }


def _job_config(config: C1Config, parameters: list[Any], label: str) -> Any:
    from google.cloud import bigquery

    return bigquery.QueryJobConfig(
        query_parameters=parameters,
        maximum_bytes_billed=config.maximum_bytes_billed,
        use_query_cache=False,
        labels={"component": "c1", "operation": label.replace("_", "-")[:63]},
    )


def _stratified_quotas(size: int, positive_available: int, negative_available: int) -> tuple[int, int]:
    total = positive_available + negative_available
    if total < size or not positive_available or not negative_available:
        raise ValueError("C1 split lacks rows from both classes for the requested sample")
    positive = min(positive_available, max(1, round(size * positive_available / total)))
    negative = size - positive
    if negative > negative_available:
        negative = negative_available
        positive = size - negative
    if positive > positive_available or negative <= 0:
        raise ValueError("C1 split cannot preserve both classes at requested sample size")
    return positive, negative


def _fit_calibrator(probabilities: list[float], labels: list[bool]) -> PlattCalibrator:
    if set(labels) != {False, True}:
        raise ValueError("C1 calibration split must contain both SLA classes")
    from sklearn.linear_model import LogisticRegression

    fitted = LogisticRegression(random_state=0, solver="lbfgs", C=1_000_000).fit(
        [[_logit(value)] for value in probabilities], labels
    )
    return PlattCalibrator(float(fitted.coef_[0][0]), float(fitted.intercept_[0]))


def _evaluate(probabilities: list[float], labels: list[bool]) -> dict[str, object]:
    from sklearn.metrics import average_precision_score, brier_score_loss, confusion_matrix, recall_score

    predictions = [value >= 0.5 for value in probabilities]
    matrix = confusion_matrix(labels, predictions, labels=[False, True]).tolist()
    bins = []
    for index in range(10):
        lower, upper = index / 10, (index + 1) / 10
        values = [value for value in zip(probabilities, labels, strict=True) if lower <= value[0] < upper or (index == 9 and value[0] == 1.0)]
        if values:
            bins.append({"lower": lower, "upper": upper, "count": len(values), "mean_probability": round(sum(value[0] for value in values) / len(values), 6), "observed_rate": round(sum(value[1] for value in values) / len(values), 6)})
    return {
        "test_row_count": len(labels),
        "positive_prevalence": round(sum(labels) / len(labels), 6),
        "pr_auc": round(float(average_precision_score(labels, probabilities)), 6),
        "recall_at_0_5_informational": round(float(recall_score(labels, predictions)), 6),
        "brier_score": round(float(brier_score_loss(labels, probabilities)), 6),
        "confusion_matrix_at_0_5_informational": {"labels": [False, True], "values": matrix},
        "calibration_bins": bins,
        "decision_threshold": "not_approved",
    }


def _write_artifacts(destination: Path, manifest: Mapping[str, object], model: SmoothedCategoricalNaiveBayes, calibrator: PlattCalibrator) -> None:
    destination.mkdir(parents=True, exist_ok=True)
    _write_json(destination / "c1-manifest.json", manifest)
    _write_json(destination / "c1-model.json", {**model.payload(), "calibrator": {"method": "platt_sigmoid", "coefficient": calibrator.coefficient, "intercept": calibrator.intercept}})


def _write_json(path: Path, payload: Mapping[str, object]) -> None:
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", dir=path.parent, delete=False) as temporary:
        json.dump(payload, temporary, ensure_ascii=False, indent=2, sort_keys=True)
        temporary.write("\n")
        temporary_path = Path(temporary.name)
    temporary_path.replace(path)


def _table_ref(config: C1Config) -> str:
    return f"{config.project}.{config.dataset}.{TABLE}"


def _amount_bounds(values: pd.Series) -> tuple[float, float, float] | None:
    present = pd.to_numeric(values, errors="coerce").dropna().abs()
    if present.empty:
        return None
    return tuple(float(present.quantile(level)) for level in (0.5, 0.9, 0.99))


def _amount_bucket(value: object, bounds: tuple[float, float, float] | None) -> str:
    numeric = pd.to_numeric(pd.Series([value]), errors="coerce").iloc[0]
    if pd.isna(numeric):
        return "MISSING"
    if bounds is None:
        return "PRESENT"
    absolute = abs(float(numeric))
    q50, q90, q99 = bounds
    return "LOW" if absolute <= q50 else "MEDIUM" if absolute <= q90 else "HIGH" if absolute <= q99 else "EXTREME"


def _item(feature: str, value: object) -> str:
    if pd.isna(value):
        return "UNKNOWN"
    if isinstance(value, bool):
        return "TRUE" if value else "FALSE"
    normalized = re.sub(r"[^A-Z0-9_.-]", "_", str(value).strip().upper())[:64]
    return normalized or "UNKNOWN"


def _logit(value: float) -> float:
    clipped = min(max(value, 1e-6), 1 - 1e-6)
    return math.log(clipped / (1 - clipped))


def _split(data: Mapping[str, object], name: str) -> C1Split:
    settings = _mapping(data, name)
    return C1Split(name, _timestamp(settings, "start_timestamp"), _timestamp(settings, "end_timestamp"), _positive_int(settings, "sample_size"))


def _validate_splits(config: C1Config) -> None:
    splits = (config.train, config.calibration, config.test)
    if any(split.end_timestamp <= split.start_timestamp for split in splits):
        raise ValueError("C1 split end_timestamp must be after start_timestamp")
    if not (config.train.end_timestamp <= config.calibration.start_timestamp <= config.calibration.end_timestamp <= config.test.start_timestamp <= config.test.end_timestamp):
        raise ValueError("C1 splits must be ordered and non-overlapping")
    if sum(split.sample_size for split in splits) != 5_000:
        raise ValueError("C1 pilot must use exactly 5000 rows")


def _split_payload(split: C1Split) -> dict[str, object]:
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


def _positive_float(data: Mapping[str, object], key: str) -> float:
    value = data.get(key)
    if not isinstance(value, (int, float)) or value <= 0:
        raise ValueError(f"{key} must be a positive number")
    return float(value)


def _timestamp(data: Mapping[str, object], key: str) -> datetime:
    value = _string(data, key)
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None:
        raise ValueError(f"{key} must include a timezone")
    return parsed
