from datetime import datetime, timezone
from pathlib import Path
import tempfile
import unittest

import pandas as pd

from bankai_pipeline.frequent_itemsets import apriori_hybrid, eclat, itemset_keys
from bankai_pipeline.kdd import (
    KddConfig,
    build_item_matrix,
    compare_rule_sets,
    consensus_rules,
    deduplicate_redundant_rules,
    drop_han_redundant_rules,
    dry_run_plan,
    evaluate_rules_on_matrix,
    mine_frequent_itemsets,
    mine_rules,
    population_definitions,
    refine_mined_rules,
    temporal_train_holdout_split,
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
        algorithms=("apriori", "fpgrowth", "eclat", "apriori_hybrid"),
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

    def test_han_filter_drops_near_duplicate_descendant_rules(self) -> None:
        rules = [
            {
                "antecedents": ["category=TRANSACTIONS"],
                "consequent": "status=IN_PROCESS",
                "support": 0.4,
                "confidence": 0.82,
                "lift": 1.2,
            },
            {
                "antecedents": ["subcategory=CARGO_NO_RECONOCIDO"],
                "consequent": "status=IN_PROCESS",
                "support": 0.1,
                "confidence": 0.84,
                "lift": 1.25,
            },
            {
                "antecedents": ["subcategory=FRAUDE"],
                "consequent": "status=IN_PROCESS",
                "support": 0.05,
                "confidence": 0.95,
                "lift": 1.4,
            },
        ]
        filtered = drop_han_redundant_rules(
            rules, (("category", "subcategory"),), epsilon=0.05
        )
        antecedents = {tuple(rule["antecedents"]) for rule in filtered}
        self.assertIn(("category=TRANSACTIONS",), antecedents)
        self.assertNotIn(("subcategory=CARGO_NO_RECONOCIDO",), antecedents)
        self.assertIn(("subcategory=FRAUDE",), antecedents)

    def test_consensus_miners_and_hybrid_match_apriori_itemsets(self) -> None:
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
        apriori_itemsets = mine_frequent_itemsets(matrix, "apriori", settings)
        fpgrowth_itemsets = mine_frequent_itemsets(matrix, "fpgrowth", settings)
        eclat_itemsets = mine_frequent_itemsets(matrix, "eclat", settings)
        hybrid_itemsets = mine_frequent_itemsets(matrix, "apriori_hybrid", settings)

        self.assertEqual(itemset_keys(apriori_itemsets), itemset_keys(fpgrowth_itemsets))
        self.assertEqual(itemset_keys(apriori_itemsets), itemset_keys(eclat_itemsets))
        self.assertEqual(itemset_keys(apriori_itemsets), itemset_keys(hybrid_itemsets))
        self.assertEqual(
            itemset_keys(eclat(matrix, min_support=0.2, use_colnames=True, max_len=4)),
            itemset_keys(apriori_hybrid(matrix, min_support=0.2, use_colnames=True, max_len=4)),
        )

        apriori = mine_rules(matrix, definition.target_column, "apriori", settings)
        fpgrowth = mine_rules(matrix, definition.target_column, "fpgrowth", settings)
        eclat_rules = mine_rules(matrix, definition.target_column, "eclat", settings)
        self.assertTrue(apriori)
        keys = {(tuple(rule["antecedents"]), rule["consequent"]) for rule in apriori}
        self.assertEqual(keys, {(tuple(rule["antecedents"]), rule["consequent"]) for rule in fpgrowth})
        self.assertEqual(keys, {(tuple(rule["antecedents"]), rule["consequent"]) for rule in eclat_rules})
        comparison = compare_rule_sets(
            {"apriori": apriori, "fpgrowth": fpgrowth, "eclat": eclat_rules}
        )
        self.assertEqual(comparison["comparison"], "apriori_fpgrowth_eclat")
        self.assertEqual(comparison["triple_jaccard"], 1.0)

    def test_temporal_holdout_split_and_rule_stability(self) -> None:
        import polars as pl

        definition = population_definitions()[0]
        frame = pl.DataFrame(
            {
                "transaction_id": [f"t{i}" for i in range(10)],
                "transaction_date": [
                    datetime(2023, 1, 15, tzinfo=timezone.utc),
                    datetime(2023, 2, 15, tzinfo=timezone.utc),
                    datetime(2023, 3, 15, tzinfo=timezone.utc),
                    datetime(2023, 4, 15, tzinfo=timezone.utc),
                    datetime(2023, 5, 15, tzinfo=timezone.utc),
                    datetime(2023, 6, 15, tzinfo=timezone.utc),
                    datetime(2023, 7, 15, tzinfo=timezone.utc),
                    datetime(2023, 8, 15, tzinfo=timezone.utc),
                    datetime(2023, 11, 15, tzinfo=timezone.utc),
                    datetime(2023, 12, 15, tzinfo=timezone.utc),
                ],
                "transaction_status": ["DECLINED"] * 6 + ["APPROVED"] * 4,
                "transaction_type": ["PURCHASE"] * 10,
                "transaction_category": ["CARD"] * 10,
                "channel": ["ONLINE"] * 6 + ["BRANCH"] * 4,
                "merchant_category": ["RETAIL"] * 10,
                "currency": ["PEN"] * 10,
                "response_code": [51] * 6 + [0] * 4,
                "is_fraud": [True] * 6 + [False] * 4,
                "amount": [20.0] * 10,
                "fraud_score": [0.9] * 6 + [0.1] * 4,
            }
        )
        train, holdout, meta = temporal_train_holdout_split(
            frame,
            "transaction_date",
            datetime(2023, 1, 1, tzinfo=timezone.utc),
            datetime(2024, 1, 1, tzinfo=timezone.utc),
            0.20,
        )
        self.assertGreater(train.height, 0)
        self.assertGreater(holdout.height, 0)
        self.assertEqual(meta["train_rows"] + meta["holdout_rows"], frame.height)

        settings = config()
        train_matrix, _ = build_item_matrix(train, definition, settings)
        holdout_matrix, _ = build_item_matrix(holdout, definition, settings)
        holdout_matrix = holdout_matrix.reindex(columns=train_matrix.columns, fill_value=False)
        apriori = mine_rules(train_matrix, definition.target_column, "apriori", settings)
        fpgrowth = mine_rules(train_matrix, definition.target_column, "fpgrowth", settings)
        eclat_rules = mine_rules(train_matrix, definition.target_column, "eclat", settings)
        consensus = consensus_rules(
            {"apriori": apriori, "fpgrowth": fpgrowth, "eclat": eclat_rules}
        )
        evaluation = evaluate_rules_on_matrix(
            consensus,
            holdout_matrix,
            min_lift=settings.min_lift,
            max_confidence_delta=0.5,
        )
        self.assertEqual(evaluation["rule_count"], len(consensus))
        self.assertIn("stable_fraction", evaluation)

    def test_dry_run_plan_has_no_graph_stage(self) -> None:
        plan = dry_run_plan(config())

        self.assertEqual(
            [population["name"] for population in plan["populations"]],
            ["transactions", "complaints"],
        )
        complaints = plan["populations"][1]
        self.assertEqual(complaints["row_filter_sql"], "UPPER(`category`) = 'TRANSACTIONS'")
        self.assertIn("resolution_days", complaints["leakage_excluded"])
        self.assertEqual(plan["validation"]["enabled"], True)
        self.assertEqual(plan["validation"]["holdout_fraction"], 0.2)
        self.assertEqual(plan["graph_compilation"], "not_requested")
