from datetime import datetime, timezone
import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

import pandas as pd

from bankai_pipeline.c2 import C2Config, C2Split, ResolutionQuantileBaseline, dry_run_plan, run_c2


UTC = timezone.utc


def split(name, start, end, size):
    return C2Split(name, datetime(*start, tzinfo=UTC), datetime(*end, tzinfo=UTC), size)


def config(output_dir):
    return C2Config(
        project="factored-hackathon",
        dataset="hackathon",
        output_dir=output_dir,
        category="Transactions",
        maximum_bytes_billed=1_000_000_000,
        min_segment_rows=30,
        train=split("train", (2023, 6, 17), (2025, 1, 1), 1500),
        calibration=split("calibration", (2025, 1, 1), (2026, 1, 1), 500),
        test=split("test", (2026, 1, 1), (2026, 6, 19), 450),
    )


def frame(size):
    return pd.DataFrame(
        {
            "priority": ["HIGH" if index % 2 else "LOW" for index in range(size)],
            "reception_channel": ["APP" if index % 3 else "BRANCH" for index in range(size)],
            "resolution_days": [float(25 if index % 2 else 10) for index in range(size)],
        }
    )


class Field:
    def __init__(self, name, field_type):
        self.name, self.field_type = name, field_type


class Table:
    schema = [
        Field("complaint_id", "STRING"), Field("creation_date", "TIMESTAMP"),
        Field("category", "STRING"), Field("status", "STRING"), Field("priority", "STRING"),
        Field("reception_channel", "STRING"), Field("resolution_days", "FLOAT"),
    ]


class Result:
    def __init__(self, data):
        self.data = data

    def __iter__(self):
        return iter(self.data.to_dict("records"))


class Job:
    def __init__(self, data, identifier):
        self.data, self.job_id, self.total_bytes_processed = data, identifier, 100

    def result(self):
        return Result(self.data)


class Client:
    def __init__(self, frames):
        self.frames, self.queries = frames, []

    def get_table(self, table):
        return Table()

    def query(self, query, job_config):
        self.queries.append(query)
        operation = job_config.labels["operation"]
        name = next(split_name for split_name in self.frames if f"c2-{split_name}-" in operation)
        return Job(self.frames[name], operation)


class C2Test(unittest.TestCase):
    def test_priority_channel_then_priority_then_global_fallback(self):
        train = pd.DataFrame(
            {
                "priority": ["HIGH"] * 4 + ["LOW"] * 4,
                "reception_channel": ["APP"] * 2 + ["BRANCH"] * 2 + ["APP"] * 4,
                "resolution_days": [20, 22, 25, 27, 8, 10, 12, 14],
            }
        )
        model = ResolutionQuantileBaseline(3).fit(train)
        predicted = model.predict(pd.DataFrame({"priority": ["LOW", "HIGH", "NEW"], "reception_channel": ["APP", "APP", "APP"], "resolution_days": [0, 0, 0]}))
        self.assertEqual(predicted[0]["cohort_level"], "priority_channel")
        self.assertEqual(predicted[1]["cohort_level"], "priority")
        self.assertEqual(predicted[2]["cohort_level"], "global")

    def test_dry_run_declares_terminal_statuses_without_status_feature(self):
        with TemporaryDirectory() as temporary:
            plan = dry_run_plan(config(Path(temporary)))
        self.assertEqual(sum(item["sample_size"] for item in plan["splits"]), 2450)
        self.assertEqual(plan["terminal_statuses"], ["Resolved", "Closed"])
        self.assertNotIn("status", plan["features"])

    def test_run_writes_aggregate_quantiles_without_ids_or_predictions(self):
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            client = Client({"train": frame(1500), "calibration": frame(500), "test": frame(450)})
            manifest = run_c2(config(root / "artifacts"), "c2-fixture-2026", client)
            output = root / "artifacts" / "c2-fixture-2026"
            serialized = (output / "c2-manifest.json").read_text(encoding="utf-8")
            model = json.loads((output / "c2-quantile-baseline.json").read_text(encoding="utf-8"))
            self.assertEqual(manifest["evaluation"]["segmented"]["test"]["row_count"], 450)
            self.assertNotIn("score_by_complaint", serialized)
            self.assertEqual(model["algorithm"], "hierarchical_p50_p90_cohort")
            self.assertTrue(all("FARM_FINGERPRINT" in query for query in client.queries))


if __name__ == "__main__":
    unittest.main()
