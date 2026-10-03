from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest

import pandas as pd

from bankai_pipeline.kdd import (
    KddConfig,
    build_item_matrix,
    compare_rule_sets,
    dry_run_plan,
    mine_rules,
    population_definitions,
)


def config(*, max_categorical_cardinality: int = 100) -> KddConfig:
    return KddConfig(
        project="factored-hackathon",
        dataset="hackathon",
        start_timestamp=datetime(2023, 1, 1, tzinfo=timezone.utc),
        end_timestamp=datetime(2024, 1, 1, tzinfo=timezone.utc),
        output_dir=Path(tempfile.gettempdir()) / "bankai-kdd-test",
        maximum_bytes_billed=2_000_000_000,
        max_rows=100_000,
        algorithms=("apriori", "fpgrowth"),
        min_support=0.20,
        min_confidence=0.60,
        min_lift=1.10,
        max_itemset_length=4,
        max_categorical_cardinality=max_categorical_cardinality,
    )


class KddTest(unittest.TestCase):
    def test_keeps_negative_amount_signal_and_excludes_high_cardinality_feature(self) -> None:
        definition = population_definitions()[0]
        frame = pd.DataFrame(
            {
                "transaction_id": ["a", "b", "c", "d", "e"],
                "transaction_date": pd.date_range("2023-01-01", periods=5, tz="UTC"),
                "transaction_status": ["DECLINED", "DECLINED", "DECLINED", "APPROVED", "APPROVED"],
                "transaction_type": ["PURCHASE"] * 5,
                "transaction_category": ["CARD"] * 5,
                "channel": ["ONLINE", "ONLINE", "ONLINE", "BRANCH", "BRANCH"],
                "merchant_category": ["m1", "m2", "m3", "m4", "m5"],
                "currency": ["PEN"] * 5,
                "response_code": [51, 51, 51, 0, 0],
                "is_fraud": [True, True, True, False, False],
                "amount": [-20.0, -30.0, -40.0, 10.0, 12.0],
                "fraud_score": [0.9, 0.8, 0.85, 0.1, 0.2],
            }
        )

        matrix, catalog = build_item_matrix(
            frame, definition, config(max_categorical_cardinality=2)
        )

        self.assertIn("amount_sign=NEGATIVE", matrix.columns)
        self.assertNotIn("merchant_category", " ".join(catalog["features"]))
        self.assertEqual(catalog["target"], "transaction_status")

    def test_apriori_and_fpgrowth_produce_same_target_rule_keys(self) -> None:
        definition = population_definitions()[0]
        frame = pd.DataFrame(
            {
                "transaction_id": ["a", "b", "c", "d", "e"],
                "transaction_date": pd.date_range("2023-01-01", periods=5, tz="UTC"),
                "transaction_status": ["DECLINED", "DECLINED", "DECLINED", "APPROVED", "APPROVED"],
                "transaction_type": ["PURCHASE"] * 5,
                "transaction_category": ["CARD"] * 5,
                "channel": ["ONLINE", "ONLINE", "ONLINE", "BRANCH", "BRANCH"],
                "merchant_category": ["RETAIL"] * 5,
                "currency": ["PEN"] * 5,
                "response_code": [51, 51, 51, 0, 0],
                "is_fraud": [True, True, True, False, False],
                "amount": [20.0, 30.0, 40.0, 10.0, 12.0],
                "fraud_score": [0.9, 0.8, 0.85, 0.1, 0.2],
            }
        )
        matrix, _ = build_item_matrix(frame, definition, config())
        settings = config()
        apriori = mine_rules(matrix, definition.target_column, "apriori", settings)
        fpgrowth = mine_rules(matrix, definition.target_column, "fpgrowth", settings)

        self.assertTrue(apriori)
        self.assertEqual(
            {(tuple(rule["antecedents"]), rule["consequent"]) for rule in apriori},
            {(tuple(rule["antecedents"]), rule["consequent"]) for rule in fpgrowth},
        )
        self.assertEqual(
            compare_rule_sets({"apriori": apriori, "fpgrowth": fpgrowth})["jaccard"],
            1.0,
        )

    def test_dry_run_plan_has_no_graph_stage(self) -> None:
        plan = dry_run_plan(config())

        self.assertEqual(plan["populations"], ["transactions", "complaints"])
        self.assertEqual(plan["graph_compilation"], "not_requested")
