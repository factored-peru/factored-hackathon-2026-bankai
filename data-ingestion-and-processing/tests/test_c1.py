from datetime import datetime, timezone
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

import pandas as pd

from bankai_pipeline.c1 import (
    C1Config,
    C1Split,
    C1FeatureTransformer,
    SmoothedCategoricalNaiveBayes,
    _stratified_quotas,
    dry_run_plan,
    run_c1,
)


UTC = timezone.utc


def split(name: str, start: tuple[int, int, int], end: tuple[int, int, int], sample_size: int) -> C1Split:
    return C1Split(name, datetime(*start, tzinfo=UTC), datetime(*end, tzinfo=UTC), sample_size)


def config(output_dir: Path) -> C1Config:
    return C1Config(
        project="factored-hackathon",
        dataset="hackathon",
        output_dir=output_dir,
        category="Transactions",
        maximum_bytes_billed=1_000_000_000,
        max_categorical_cardinality=100,
        alpha=1.0,
        train=split("train", (2023, 6, 17), (2025, 1, 1), 3500),
        calibration=split("calibration", (2025, 1, 1), (2026, 1, 1), 750),
        test=split("test", (2026, 1, 1), (2026, 6, 19), 750),
    )


def frame(size: int, timestamp: str) -> pd.DataFrame:
    labels = [(index % 5) == 0 for index in range(size)]
    return pd.DataFrame(
        {
            "creation_date": [timestamp] * size,
            "case_type": ["UNKNOWN_CARD" if label else "OTHER" for label in labels],
            "category": ["Transactions"] * size,
            "subcategory": ["UNRECOGNIZED" if label else "OTHER" for label in labels],
            "reception_channel": ["APP"] * size,
            "priority": ["HIGH" if label else "LOW" for label in labels],
            "currency": ["PEN"] * size,
            "is_repeat_complainer": labels,
            "claimed_amount": [1000.0 if label else 10.0 for label in labels],
            "sla_breached": labels,
        }
    )


class FakeField:
    def __init__(self, name: str, field_type: str) -> None:
        self.name = name
        self.field_type = field_type


class FakeTable:
    schema = [
        FakeField("complaint_id", "STRING"),
        FakeField("creation_date", "TIMESTAMP"),
        FakeField("case_type", "STRING"),
        FakeField("category", "STRING"),
        FakeField("subcategory", "STRING"),
        FakeField("reception_channel", "STRING"),
        FakeField("priority", "STRING"),
        FakeField("currency", "STRING"),
        FakeField("is_repeat_complainer", "BOOLEAN"),
        FakeField("claimed_amount", "FLOAT"),
        FakeField("sla_breached", "BOOLEAN"),
    ]


class FakeResult:
    def __init__(self, rows=None, data_frame=None) -> None:
        self.rows = rows or []
        self.data_frame = data_frame

    def __iter__(self):
        if self.data_frame is not None:
            return iter(self.data_frame.to_dict("records"))
        return iter(self.rows)

    def to_dataframe(self):
        assert self.data_frame is not None
        return self.data_frame.copy()


class FakeJob:
    def __init__(self, result: FakeResult, identifier: str) -> None:
        self._result = result
        self.job_id = identifier
        self.total_bytes_processed = 100

    def result(self):
        return self._result


class FakeClient:
    def __init__(self, frames: dict[str, pd.DataFrame]) -> None:
        self.frames = frames
        self.queries: list[str] = []

    def get_table(self, table: str):
        return FakeTable()

    def query(self, query: str, job_config):
        self.queries.append(query)
        operation = job_config.labels["operation"]
        split_name = next(name for name in self.frames if f"c1-{name}-" in operation)
        if operation.endswith("counts"):
            return FakeJob(FakeResult(rows=[{"label": False, "row_count": 10000}, {"label": True, "row_count": 2500}]), operation)
        return FakeJob(FakeResult(data_frame=self.frames[split_name]), operation)


class C1Test(unittest.TestCase):
    def test_smoothed_model_prefers_observed_sla_pattern(self) -> None:
        train = frame(10, "2024-01-01T00:00:00Z")
        transformer = C1FeatureTransformer(100).fit(train)
        records, labels = transformer.transform(train)
        model = SmoothedCategoricalNaiveBayes(1.0).fit(records, labels)
        positive = model.probability(records[0])
        negative = model.probability(records[1])
        self.assertGreater(positive, negative)
        self.assertGreater(positive, 0.5)

    def test_quotas_preserve_prevalence_and_reject_incomplete_splits(self) -> None:
        self.assertEqual(_stratified_quotas(500, 200, 800), (100, 400))
        with self.assertRaisesRegex(ValueError, "lacks rows"):
            _stratified_quotas(500, 0, 800)

    def test_dry_run_excludes_leakage_and_has_fixed_pilot_size(self) -> None:
        with TemporaryDirectory() as temporary:
            plan = dry_run_plan(config(Path(temporary)))
        self.assertEqual(sum(item["sample_size"] for item in plan["splits"]), 5000)
        self.assertIn("status", plan["leakage_exclusions"])
        self.assertEqual(plan["publication"], "not_requested")

    def test_run_writes_aggregate_artifacts_without_identifiers(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            settings = config(root / "artifacts")
            client = FakeClient(
                {
                    "train": frame(3500, "2024-06-01T00:00:00Z"),
                    "calibration": frame(750, "2025-06-01T00:00:00Z"),
                    "test": frame(750, "2026-03-01T00:00:00Z"),
                }
            )
            manifest = run_c1(settings, "c1-fixture-2026", client)
            output = root / "artifacts" / "c1-fixture-2026"
            serialized = (output / "c1-manifest.json").read_text(encoding="utf-8")
            model = json.loads((output / "c1-model.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["metrics"]["test_row_count"], 750)
            self.assertNotIn("synthetic", serialized)
            self.assertNotIn("score_by_complaint", serialized)
            self.assertEqual(model["calibrator"]["method"], "platt_sigmoid")
            sample_queries = [query for query in client.queries if "FARM_FINGERPRINT" in query]
            self.assertEqual(len(sample_queries), 3)
            self.assertTrue(all("SELECT `creation_date`" in query for query in sample_queries))


if __name__ == "__main__":
    unittest.main()
