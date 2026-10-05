"""Tests for graph-diff gate and support snapshot helpers."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

import pandas as pd

from bankai_pipeline.graph_diff import (
    DiffGateConfig,
    GraphDiffError,
    assert_diff_gate_passed,
    build_support_snapshot,
    item_support_from_matrix,
    run_graph_diff,
)


def _write_population(
    root: Path,
    *,
    population: str,
    rules: list[dict[str, object]],
) -> None:
    payload = {
        "feature_catalog": {"features": ["channel=POS", "transaction_status=DECLINED"]},
        "rules": {
            "apriori": rules,
            "fpgrowth": rules,
            "eclat": rules,
        },
        "comparison": {},
        "diagnostics": {},
        "validation": None,
    }
    (root / f"{population}_kdd.json").write_text(
        json.dumps(payload, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )


def _write_bundle(
    root: Path,
    *,
    run_id: str,
    rules: list[dict[str, object]],
    row_count: int = 100,
    holdout_stable: float | None = None,
) -> None:
    root.mkdir(parents=True, exist_ok=True)
    (root / "kdd_manifest.json").write_text(
        json.dumps(
            {
                "run_id": run_id,
                "kdd_version": "v1",
                "populations": ["transactions"],
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )
    _write_population(root, population="transactions", rules=rules)
    snapshot = build_support_snapshot(
        run_id=run_id,
        window={"start_timestamp": "2026-01-01T00:00:00Z", "end_timestamp": "2026-10-01T00:00:00Z"},
        populations={
            "transactions": {
                "row_count": row_count,
                "item_support": {"channel=POS": 0.4, "transaction_status=DECLINED": 0.2},
            }
        },
    )
    (root / "population-support-snapshot.json").write_text(
        json.dumps(snapshot, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    if holdout_stable is not None:
        validation = root / "validation"
        validation.mkdir(parents=True, exist_ok=True)
        (validation / "transactions.json").write_text(
            json.dumps(
                {
                    "holdout": {
                        "rule_count": len(rules),
                        "stable_rule_count": int(round(holdout_stable * len(rules))),
                        "stable_fraction": holdout_stable,
                        "rules": [],
                    }
                },
                indent=2,
                sort_keys=True,
            )
            + "\n",
            encoding="utf-8",
        )


SHARED_RULE = {
    "antecedents": ["channel=POS"],
    "consequent": "transaction_status=DECLINED",
    "support": 0.1,
    "confidence": 0.5,
    "lift": 2.0,
}


class GraphDiffTests(unittest.TestCase):
    def test_item_support_from_matrix(self) -> None:
        matrix = pd.DataFrame({"a=1": [True, False, True], "b=2": [False, False, True]})
        self.assertEqual(item_support_from_matrix(matrix), {"a=1": 0.666667, "b=2": 0.333333})

    def test_stable_diff_passes_gate(self) -> None:
        with TemporaryDirectory() as tmp:
            previous = Path(tmp) / "prev"
            candidate = Path(tmp) / "cand"
            _write_bundle(previous, run_id="prev-run", rules=[SHARED_RULE], row_count=100)
            _write_bundle(
                candidate,
                run_id="cand-run",
                rules=[SHARED_RULE],
                row_count=105,
                holdout_stable=0.9,
            )
            report = run_graph_diff(previous, candidate, output=Path(tmp) / "diff.json")
            self.assertTrue(report["gate"]["passed"])
            self.assertEqual(report["jaccard"], 1.0)
            self.assertEqual(report["row_count_deltas"]["transactions"]["delta"], 5)
            loaded = assert_diff_gate_passed(Path(tmp) / "diff.json")
            self.assertEqual(loaded["candidate_run_id"], "cand-run")

    def test_high_churn_fails_gate(self) -> None:
        with TemporaryDirectory() as tmp:
            previous = Path(tmp) / "prev"
            candidate = Path(tmp) / "cand"
            _write_bundle(previous, run_id="prev-run", rules=[SHARED_RULE])
            other = {
                **SHARED_RULE,
                "antecedents": ["channel=WEB"],
                "support": 0.2,
            }
            _write_bundle(candidate, run_id="cand-run", rules=[other])
            report = run_graph_diff(
                previous,
                candidate,
                gate=DiffGateConfig(min_jaccard=0.5, max_removed_ratio=0.1, max_added_ratio=0.1),
            )
            self.assertFalse(report["gate"]["passed"])
            self.assertEqual(report["consensus_rule_count"]["removed"], 1)
            self.assertEqual(report["consensus_rule_count"]["added"], 1)
            with self.assertRaises(GraphDiffError):
                assert_diff_gate_passed(Path(tmp) / "missing.json")


if __name__ == "__main__":
    unittest.main()
