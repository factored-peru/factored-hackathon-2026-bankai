from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest

import pandas as pd

from bankai_pipeline.kdd import (
    KddConfig,
    build_item_matrix,
    compare_rule_sets,
    deduplicate_redundant_rules,
    dry_run_plan,
    mine_rules,
    population_definitions,
    refine_mined_rules,
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

    def test_complaints_exclude_status_leakage_and_filler_sign(self) -> None:
        definition = next(
            item for item in population_definitions() if item.name == "complaints"
        )
        frame = pd.DataFrame(
            {
                "complaint_id": [f"c{i}" for i in range(6)],
                "creation_date": pd.date_range("2023-01-01", periods=6, tz="UTC"),
                "status": ["Resolved"] * 4 + ["Open", "Open"],
                "case_type": ["Complaint"] * 6,
                "category": ["Transactions"] * 6,
                "subcategory": ["Cargo no reconocido"] * 6,
                "reception_channel": ["App"] * 4 + ["Branch", "Branch"],
                "priority": ["High"] * 4 + ["Low", "Low"],
                "sla_breached": [True, True, False, False, False, False],
                "is_repeat_complainer": [False] * 6,
                "claimed_amount": [10.0, 20.0, 30.0, 40.0, 15.0, 18.0],
                "resolution_days": [5.0, 6.0, 7.0, 8.0, None, None],
            }
        )
        matrix, catalog = build_item_matrix(frame, definition, config())
        features = " ".join(catalog["features"])
        self.assertNotIn("sla_breached=", features)
        self.assertNotIn("resolution_days", features)
        self.assertNotIn("claimed_amount_sign=NON_NEGATIVE", features)
        self.assertEqual(
            catalog["excluded_target_leakage_columns"],
            ["resolution_days", "sla_breached"],
        )

    def test_refine_drops_hierarchical_and_redundant_rules(self) -> None:
        definition = next(
            item for item in population_definitions() if item.name == "complaints"
        )
        rules = [
            {
                "antecedents": ["priority=HIGH"],
                "consequent": "status=RESOLVED",
                "support": 0.2,
                "confidence": 0.8,
                "lift": 1.5,
            },
            {
                "antecedents": ["priority=HIGH", "reception_channel=APP"],
                "consequent": "status=RESOLVED",
                "support": 0.2,
                "confidence": 0.8,
                "lift": 1.5,
            },
            {
                "antecedents": ["category=TRANSACTIONS", "subcategory=CARGO_NO_RECONOCIDO"],
                "consequent": "status=RESOLVED",
                "support": 0.3,
                "confidence": 0.9,
                "lift": 1.2,
            },
        ]
        refined = refine_mined_rules(rules, definition)
        self.assertEqual(len(refined), 1)
        self.assertEqual(refined[0]["antecedents"], ["priority=HIGH"])
        self.assertEqual(
            deduplicate_redundant_rules(rules[:2])[0]["antecedents"], ["priority=HIGH"]
        )

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

        self.assertEqual(
            [population["name"] for population in plan["populations"]],
            ["transactions", "complaints"],
        )
        complaints = plan["populations"][1]
        self.assertEqual(complaints["row_filter_sql"], "`category` = 'Transactions'")
        self.assertIn("resolution_days", complaints["leakage_excluded"])
        self.assertEqual(plan["graph_compilation"], "not_requested")
