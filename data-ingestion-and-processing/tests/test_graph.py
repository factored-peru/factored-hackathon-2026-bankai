import hashlib
import io
import json
from contextlib import redirect_stdout
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from unittest.mock import patch

import msgpack

from bankai_pipeline.cli import main
from bankai_pipeline.graph import (
    GRAPH_FILENAME,
    GraphInputError,
    compile_graph,
    graph_dry_run_plan,
)


def rule(antecedents, consequent, support=0.4, confidence=0.8, lift=1.6):
    return {
        "antecedents": sorted(antecedents),
        "consequent": consequent,
        "support": support,
        "confidence": confidence,
        "lift": lift,
    }


def population_result(target, features, apriori, fpgrowth):
    return {
        "quality_profile": {"row_count": 10},
        "feature_catalog": {
            "target": target,
            "features": sorted(features),
            "excluded_high_cardinality_columns": [],
        },
        "rules": {"apriori": apriori, "fpgrowth": fpgrowth},
        "comparison": {"comparison": "apriori_vs_fpgrowth"},
    }


def write_kdd_fixture(root: Path) -> Path:
    root.mkdir()
    manifest = {
        "run_id": "kdd-fixture-2026",
        "kdd_version": "v1",
        "config_hash": "fixture",
        "lineage": [],
        "populations": ["transactions", "complaints"],
        "graph_compilation": "not_requested",
    }
    (root / "kdd_manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    transaction_features = [
        "transaction_status=APPROVED",
        "transaction_status=DECLINED",
        "channel=POS",
        "is_fraud=TRUE",
    ]
    transaction_consensus = rule(
        ["channel=POS", "is_fraud=TRUE"], "transaction_status=DECLINED"
    )
    transaction_single_algorithm = rule(["channel=POS"], "transaction_status=APPROVED")
    (root / "transactions_kdd.json").write_text(
        json.dumps(
            population_result(
                "transaction_status",
                transaction_features,
                [transaction_consensus],
                [transaction_consensus, transaction_single_algorithm],
            )
        ),
        encoding="utf-8",
    )
    complaint_features = [
        "status=OPEN",
        "status=RESOLVED",
        "priority=HIGH",
        "sla_breached=TRUE",
    ]
    complaint_consensus = rule(
        ["priority=HIGH", "sla_breached=TRUE"], "status=OPEN", 0.3, 0.75, 1.25
    )
    (root / "complaints_kdd.json").write_text(
        json.dumps(
            population_result(
                "status", complaint_features, [complaint_consensus], [complaint_consensus]
            )
        ),
        encoding="utf-8",
    )
    return root


class GraphCompileTest(unittest.TestCase):
    def test_compiles_only_consensus_rules_as_reified_graph_nodes(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            kdd_dir = write_kdd_fixture(root / "kdd")
            manifest = compile_graph(kdd_dir, root / "graph", "graph-fixture-2026")
            graph_path = root / "graph" / "graph-fixture-2026" / GRAPH_FILENAME
            payload = msgpack.unpackb(graph_path.read_bytes(), raw=False)

            self.assertEqual(manifest["source"]["rule_count"], 2)
            self.assertEqual(manifest["publication"], "not_requested")
            self.assertEqual(
                manifest["graph_sha256"], hashlib.sha256(graph_path.read_bytes()).hexdigest()
            )
            self.assertEqual(
                set(manifest["source"]["kdd_population_sha256"]),
                {"transactions", "complaints"},
            )
            self.assertEqual(payload["schema_version"], "bankai-kdd-graph-v1")
            rule_nodes = [node for node in payload["nodes"] if node["kind"] == "rule"]
            self.assertEqual(len(rule_nodes), 2)
            direct_value_targets = [
                edge
                for edge in payload["edges"]
                if edge["source"].startswith("value:")
                and edge["target"].startswith("target:")
            ]
            self.assertEqual(direct_value_targets, [])
            predictions = [edge for edge in payload["edges"] if edge["relation"] == "predicts"]
            self.assertEqual(len(predictions), 2)
            self.assertEqual(predictions[0]["attributes"]["algorithms"], ["apriori", "fpgrowth"])

    def test_output_is_deterministic_for_same_kdd_input(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            kdd_dir = write_kdd_fixture(root / "kdd")
            compile_graph(kdd_dir, root / "graph-a", "graph-fixture-2026")
            compile_graph(kdd_dir, root / "graph-b", "graph-fixture-2026")
            left = (root / "graph-a" / "graph-fixture-2026" / GRAPH_FILENAME).read_bytes()
            right = (root / "graph-b" / "graph-fixture-2026" / GRAPH_FILENAME).read_bytes()
            self.assertEqual(left, right)

    def test_rejects_divergent_consensus_metrics_and_disallowed_features(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            kdd_dir = write_kdd_fixture(root / "kdd")
            transaction = json.loads((kdd_dir / "transactions_kdd.json").read_text())
            transaction["rules"]["fpgrowth"][0]["lift"] = 1.7
            (kdd_dir / "transactions_kdd.json").write_text(json.dumps(transaction))
            with self.assertRaisesRegex(GraphInputError, "divergent metrics"):
                compile_graph(kdd_dir, root / "graph", "graph-fixture-2026")

            kdd_dir = write_kdd_fixture(root / "kdd-second")
            transaction = json.loads((kdd_dir / "transactions_kdd.json").read_text())
            transaction["feature_catalog"]["features"].append("customer_id=LEAK")
            (kdd_dir / "transactions_kdd.json").write_text(json.dumps(transaction))
            with self.assertRaisesRegex(GraphInputError, "disallowed feature"):
                compile_graph(kdd_dir, root / "graph", "graph-fixture-2026")

    def test_rejects_empty_consensus_and_dry_run_does_not_write(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            kdd_dir = write_kdd_fixture(root / "kdd")
            transaction = json.loads((kdd_dir / "transactions_kdd.json").read_text())
            transaction["rules"]["fpgrowth"] = []
            complaints = json.loads((kdd_dir / "complaints_kdd.json").read_text())
            complaints["rules"]["fpgrowth"] = []
            (kdd_dir / "transactions_kdd.json").write_text(json.dumps(transaction))
            (kdd_dir / "complaints_kdd.json").write_text(json.dumps(complaints))
            with self.assertRaisesRegex(GraphInputError, "no corroborated rules"):
                graph_dry_run_plan(kdd_dir, root / "graph", "graph-fixture-2026")

            kdd_dir = write_kdd_fixture(root / "kdd-valid")
            plan = graph_dry_run_plan(kdd_dir, root / "graph", "graph-fixture-2026")
            self.assertEqual(plan["publication"], "not_requested")
            self.assertFalse((root / "graph").exists())

    def test_cli_compile_graph_dry_run(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            kdd_dir = write_kdd_fixture(root / "kdd")
            output = io.StringIO()
            with patch(
                "sys.argv",
                [
                    "bankai-pipeline",
                    "--stage",
                    "compile-graph",
                    "--run-id",
                    "graph-fixture-2026",
                    "--kdd-artifact-dir",
                    str(kdd_dir),
                    "--graph-output-dir",
                    str(root / "graph"),
                    "--dry-run",
                ],
            ), redirect_stdout(output):
                main()
            self.assertEqual(json.loads(output.getvalue())["consensus_rule_count"], 2)
            self.assertFalse((root / "graph").exists())
