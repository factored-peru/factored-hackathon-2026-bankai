"""Tests for sanitized interpretability reporting."""

from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from bankai_pipeline.metrics_report import (
    association_rule_enrichment,
    association_rule_stats,
    build_report,
    render_markdown_report,
    validation_gaps,
)


class MetricsReportTest(unittest.TestCase):
    def test_enrichment_conviction_and_leverage(self) -> None:
        enriched = association_rule_enrichment(
            {
                "antecedents": ["response_code=51"],
                "consequent": "transaction_status=DECLINED",
                "support": 0.02,
                "confidence": 0.5,
                "lift": 10.0,
            }
        )
        self.assertEqual(enriched["consequent_prevalence"], 0.05)
        self.assertEqual(enriched["conviction"], 1.9)
        self.assertEqual(enriched["leverage"], 0.018)

    def test_perfect_confidence_caps_conviction(self) -> None:
        enriched = association_rule_enrichment(
            {
                "antecedents": ["a=1", "b=2"],
                "consequent": "y=1",
                "support": 0.1,
                "confidence": 1.0,
                "lift": 2.0,
            }
        )
        self.assertIsNone(enriched["conviction"])
        self.assertEqual(enriched["antecedent_length"], 2)

    def test_association_stats_and_report_layers(self) -> None:
        rules = [
            {
                "antecedents": ["channel=APP"],
                "consequent": "transaction_status=APPROVED",
                "support": 0.2,
                "confidence": 0.8,
                "lift": 1.1,
            },
            {
                "antecedents": ["response_code=51"],
                "consequent": "transaction_status=DECLINED",
                "support": 0.02,
                "confidence": 0.5,
                "lift": 10.0,
            },
        ]
        stats = association_rule_stats(rules, top_n=2)
        self.assertEqual(stats["rule_count"], 2)
        self.assertEqual(stats["top_by_lift"][0]["consequent"], "transaction_status=DECLINED")
        self.assertIn("response_code", stats["feature_antecedent_frequency"])

        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            kdd_dir = root / "kdd"
            kdd_dir.mkdir()
            (kdd_dir / "kdd_manifest.json").write_text(
                json.dumps(
                    {
                        "run_id": "kdd-test",
                        "populations": ["transactions"],
                        "consensus_algorithms": ["apriori", "eclat", "fpgrowth"],
                        "lineage": [],
                    }
                ),
                encoding="utf-8",
            )
            (kdd_dir / "transactions_kdd.json").write_text(
                json.dumps(
                    {
                        "rules": {"fpgrowth": rules, "apriori": rules, "eclat": rules},
                        "comparison": {"triple_jaccard": 1.0},
                        "diagnostics": {},
                        "quality_profile": {"row_count": 100},
                        "feature_catalog": {
                            "target": "transaction_status",
                            "features": ["channel=APP"],
                            "excluded_target_leakage_columns": [],
                        },
                    }
                ),
                encoding="utf-8",
            )
            suite_dir = root / "suite"
            suite_dir.mkdir()
            (suite_dir / "supervised-suite-manifest.json").write_text(
                json.dumps(
                    {
                        "run_id": "suite-test",
                        "schema_version": "bankai-supervised-suite-v1",
                        "blocked_cases": {"C6": "missing join"},
                        "cases": {},
                    }
                ),
                encoding="utf-8",
            )
            case_dirs = {}
            for case, target, metrics_key, metrics in (
                (
                    "C1",
                    "sla_breached",
                    "metrics",
                    {
                        "pr_auc": 0.2,
                        "brier_score": 0.1,
                        "recall_at_0_5_informational": 0.0,
                        "positive_prevalence": 0.2,
                        "decision_threshold": "not_approved",
                        "test_row_count": 10,
                        "prevalence_baseline": {"pr_auc": 0.2},
                    },
                ),
                (
                    "C2",
                    "resolution_days",
                    "evaluation",
                    {
                        "global": {
                            "test": {
                                "mae_against_p50": 7.0,
                                "p50_empirical_coverage": 0.5,
                                "p90_empirical_coverage": 0.9,
                                "row_count": 10,
                            }
                        },
                        "segmented": {"test": {}},
                    },
                ),
                (
                    "C3",
                    "is_fraud",
                    "metrics",
                    {
                        "model": {"pr_auc": 0.001, "row_count": 10},
                        "fraud_score": {"pr_auc": 0.7},
                    },
                ),
                (
                    "C4",
                    None,
                    "metrics",
                    {
                        "requires_followup": {
                            "test": {"pr_auc": 0.2, "recall_at_0_5_informational": 0.0, "row_count": 5}
                        }
                    },
                ),
                (
                    "C5",
                    "main_score",
                    "metrics",
                    {
                        "test": {
                            "mae_expected_score": 1.2,
                            "quadratic_weighted_kappa": 0.0,
                            "macro_f1": 0.1,
                            "row_count": 5,
                        }
                    },
                ),
            ):
                directory = root / case.lower()
                directory.mkdir()
                payload = {
                    "case": case,
                    "target": target,
                    "run_id": f"{case.lower()}-test",
                    "schema_version": f"bankai-{case.lower()}-v1",
                    "publication": "not_requested",
                    metrics_key: metrics,
                }
                (directory / f"{case.lower()}-manifest.json").write_text(
                    json.dumps(payload), encoding="utf-8"
                )
                case_dirs[case] = directory

            report = build_report(
                run_id="metrics-test",
                kdd_dir=kdd_dir,
                suite_dir=suite_dir,
                case_dirs=case_dirs,
                graph_dir=None,
            )
            self.assertEqual(report["schema_version"], "bankai-interpretability-report-v1")
            self.assertEqual(report["layers"]["association"]["transactions"]["stats"]["rule_count"], 2)
            self.assertEqual(sorted(report["layers"]["supervised"]), ["C1", "C2", "C3", "C4", "C5"])
            self.assertIn("C6", report["layers"]["blocked"])
            self.assertEqual(report["validation_gaps"], validation_gaps(kdd_has_temporal_sets=False))
            markdown = render_markdown_report(report)
            self.assertIn("Capa asociativa", markdown)
            self.assertIn("Capa supervisada", markdown)
            self.assertNotIn("StratifiedKFold was run", markdown)
            self.assertTrue(
                any("KDD association mining has no temporal" in gap for gap in report["validation_gaps"])
            )

            validation_dir = kdd_dir / "validation"
            validation_dir.mkdir()
            (validation_dir / "transactions-holdout-metrics.json").write_text(
                json.dumps(
                    {
                        "protocol": "temporal_train_holdout",
                        "consensus_rule_count": 2,
                        "holdout": {"stable_fraction": 1.0},
                        "split": {"holdout_fraction": 0.2},
                    }
                ),
                encoding="utf-8",
            )
            report_with_sets = build_report(
                run_id="metrics-test",
                kdd_dir=kdd_dir,
                suite_dir=suite_dir,
                case_dirs=case_dirs,
                graph_dir=None,
            )
            self.assertIsNotNone(report_with_sets["kdd_provenance"]["set_validation"])
            self.assertFalse(
                any(
                    "KDD association mining has no temporal" in gap
                    for gap in report_with_sets["validation_gaps"]
                )
            )


if __name__ == "__main__":
    unittest.main()
