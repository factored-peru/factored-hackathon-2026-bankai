from datetime import datetime
import unittest
import io
from contextlib import redirect_stdout, redirect_stderr
from unittest.mock import patch

import pandas as pd

from bankai_pipeline.dispute_contracts import COMPLAINTS
from bankai_pipeline.lineage import SourceSnapshot, build_lineage_manifest
from bankai_pipeline.preparation import (
    ImputationRule,
    PreparationError,
    default_imputation_rules,
    prepare_population,
)
from bankai_pipeline.cli import main


class PreparationTest(unittest.TestCase):
    def test_deduplicates_latest_row_and_preserves_missingness_signal(self) -> None:
        frame = pd.DataFrame(
            [
                {
                    "complaint_id": "synthetic-a",
                    "creation_date": "2026-01-01T00:00:00Z",
                    "case_type": "charge",
                    "category": "transactions",
                    "subcategory": None,
                    "reception_channel": "phone",
                    "priority": "high",
                    "currency": "PEN",
                    "claimed_amount": 10.0,
                },
                {
                    "complaint_id": "synthetic-a",
                    "creation_date": "2026-01-02T00:00:00Z",
                    "case_type": "charge",
                    "category": "transactions",
                    "subcategory": None,
                    "reception_channel": "phone",
                    "priority": "high",
                    "currency": "PEN",
                    "claimed_amount": None,
                },
                {
                    "complaint_id": "synthetic-b",
                    "creation_date": "2026-01-03T00:00:00Z",
                    "case_type": "charge",
                    "category": "transactions",
                    "subcategory": "duplicate",
                    "reception_channel": None,
                    "priority": None,
                    "currency": "PEN",
                    "claimed_amount": 20.0,
                },
            ]
        )
        result = prepare_population(frame, COMPLAINTS, rules=default_imputation_rules(COMPLAINTS))

        self.assertEqual(result.manifest["source_row_count"], 3)
        self.assertEqual(result.manifest["output_row_count"], 2)
        self.assertEqual(result.manifest["deduplicated_row_count"], 1)
        self.assertTrue(result.frame.loc[0, "subcategory_was_imputed"])
        self.assertTrue(result.frame.loc[0, "claimed_amount_was_imputed"])
        self.assertEqual(result.frame.loc[1, "priority"], "UNKNOWN")
        self.assertNotIn("synthetic-a", str(result.manifest))

    def test_rejects_timestamp_imputation_and_missing_group_column(self) -> None:
        frame = pd.DataFrame(
            {"complaint_id": ["a"], "creation_date": [datetime(2026, 1, 1)]}
        )
        with self.assertRaises(PreparationError):
            prepare_population(
                frame,
                COMPLAINTS,
                rules=(ImputationRule("creation_date", "categorical"),),
            )

    def test_lineage_manifest_contains_hashes_not_source_values(self) -> None:
        manifest = build_lineage_manifest(
            run_id="prepare-local-20261004",
            stage="prepare",
            inputs=(
                SourceSnapshot("gcs", "a" * 64, "123", "v1", 3, "2026-10-04T00:00:00Z"),
            ),
            transformations=("deduplicate_latest", "impute_v1"),
            output_version="cur-v1",
        )
        self.assertEqual(manifest["manifest_version"], "bankai-lineage-v1")
        self.assertTrue(manifest["contains_source_values"] is False)
        self.assertEqual(len(str(manifest["content_hash"])), 64)

    def test_prepare_cli_is_dry_run_only_until_ingestion_worker_exists(self) -> None:
        output = io.StringIO()
        with patch(
            "sys.argv",
            ["bankai-pipeline", "--stage", "prepare", "--run-id", "prepare-local-20261004", "--dry-run"],
        ), redirect_stdout(output):
            main()
        self.assertIn('"cloud_execution": "not_requested"', output.getvalue())

    def test_prepare_cli_without_dry_run_requires_canonical_or_adr(self) -> None:
        err = io.StringIO()
        with patch(
            "sys.argv",
            ["bankai-pipeline", "--stage", "prepare", "--run-id", "prepare-local-20261004"],
        ), redirect_stderr(err), self.assertRaises(SystemExit):
            main()
        self.assertIn("--canonical-prepare", err.getvalue())


if __name__ == "__main__":
    unittest.main()
