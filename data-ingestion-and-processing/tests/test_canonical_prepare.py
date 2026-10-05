import io
import unittest
from contextlib import redirect_stderr, redirect_stdout
from unittest.mock import patch

from bankai_pipeline.canonical_prepare import (
    build_config,
    canonical_prepare_dry_run_plan,
    cur_sql,
    sql_imputation_markers,
    stg_sql,
)
from bankai_pipeline.cli import main
from bankai_pipeline.dispute_contracts import COMPLAINTS, CONTRACTS
from bankai_pipeline.preparation import default_imputation_rules, prepare_population
import pandas as pd


class CanonicalPrepareTest(unittest.TestCase):
    def test_dry_run_plan_lists_four_tables_and_stages(self) -> None:
        config = build_config(project="factored-hackathon", run_id="prepare-local-canonical")
        plan = canonical_prepare_dry_run_plan(config)
        self.assertEqual(plan["prepare_mode"], "canonical")
        self.assertEqual(plan["cloud_execution"], "not_requested")
        self.assertEqual(len(plan["tables"]), len(CONTRACTS))
        names = {table["table"] for table in plan["tables"]}
        self.assertEqual(names, set(CONTRACTS))
        for table in plan["tables"]:
            self.assertIn("stg", table["sql"])
            self.assertIn("aux", table["sql"])
            self.assertIn("cur", table["sql"])
            self.assertIn("CREATE OR REPLACE TABLE", table["sql"]["stg"])

    def test_cli_rejects_prepare_without_canonical_flag(self) -> None:
        err = io.StringIO()
        with patch(
            "sys.argv",
            ["bankai-pipeline", "--stage", "prepare", "--run-id", "prepare-local-20261005"],
        ), redirect_stderr(err), self.assertRaises(SystemExit):
            main()
        self.assertIn("--canonical-prepare", err.getvalue())

    def test_cli_canonical_dry_run(self) -> None:
        output = io.StringIO()
        with patch(
            "sys.argv",
            [
                "bankai-pipeline",
                "--stage",
                "prepare",
                "--run-id",
                "prepare-local-canonical",
                "--dry-run",
                "--canonical-prepare",
            ],
        ), redirect_stdout(output):
            main()
        body = output.getvalue()
        self.assertIn('"prepare_mode": "canonical"', body)
        self.assertIn('"table": "transactions"', body)

    def test_cur_sql_includes_was_imputed_and_unknown_fallback(self) -> None:
        config = build_config(project="factored-hackathon", run_id="prepare-local-canonical")
        rules = default_imputation_rules(COMPLAINTS)
        sql = cur_sql(config, COMPLAINTS, rules)
        markers = sql_imputation_markers(rules)
        for column in markers["was_imputed_columns"]:
            self.assertIn(column, sql)
        self.assertIn("UNKNOWN", sql)
        self.assertIn("PERCENTILE_CONT", sql)
        self.assertIn(f"`{config.project}.{config.cur_dataset}.complaints`", sql)

    def test_stg_sql_dedupes_by_primary_key(self) -> None:
        config = build_config(project="factored-hackathon", run_id="prepare-local-canonical")
        sql = stg_sql(config, COMPLAINTS)
        self.assertIn("ROW_NUMBER()", sql)
        self.assertIn("PARTITION BY `complaint_id`", sql)
        self.assertIn("__bankai_rn = 1", sql)

    def test_pandas_imputation_parity_markers(self) -> None:
        frame = pd.DataFrame(
            [
                {
                    "complaint_id": "synthetic-a",
                    "creation_date": "2026-01-02T00:00:00Z",
                    "case_type": "charge",
                    "category": "transactions",
                    "subcategory": None,
                    "reception_channel": "phone",
                    "priority": None,
                    "currency": "PEN",
                    "claimed_amount": None,
                },
                {
                    "complaint_id": "synthetic-b",
                    "creation_date": "2026-01-03T00:00:00Z",
                    "case_type": "charge",
                    "category": "transactions",
                    "subcategory": "duplicate",
                    "reception_channel": "phone",
                    "priority": "high",
                    "currency": "PEN",
                    "claimed_amount": 20.0,
                },
            ]
        )
        result = prepare_population(frame, COMPLAINTS, rules=default_imputation_rules(COMPLAINTS))
        self.assertTrue(bool(result.frame.loc[0, "priority_was_imputed"]))
        self.assertEqual(result.frame.loc[0, "priority"], "UNKNOWN")
        self.assertTrue(bool(result.frame.loc[0, "claimed_amount_was_imputed"]))
        config = build_config(project="factored-hackathon", run_id="prepare-local-canonical")
        sql = cur_sql(config, COMPLAINTS, default_imputation_rules(COMPLAINTS))
        self.assertIn("priority_was_imputed", sql)
        self.assertIn("claimed_amount_was_imputed", sql)


if __name__ == "__main__":
    unittest.main()
