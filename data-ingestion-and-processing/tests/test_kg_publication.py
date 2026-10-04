import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from bankai_pipeline.graph import CompiledGraph, GraphArtifactWriter, GraphEdge, GraphInputError, GraphNode
from bankai_pipeline.kg_publication import CURRENT_FILENAME, publish_local_graph


def graph() -> CompiledGraph:
    return CompiledGraph(
        source={
            "kdd_run_id": "kdd-fixture-2026",
            "case_catalog_version": "bankai-dispute-kg-cases-v1",
        },
        nodes=(
            GraphNode("case:C1", "case", {"case_id": "C1", "status": "exploratory_not_promoted", "target": "sla_breached", "predictors": ["priority"], "limitation": "No threshold."}),
            GraphNode("population:transactions", "population", {"name": "transactions", "target": "transaction_status"}),
            GraphNode("value:transactions:channel=POS", "feature_value", {"feature": "channel", "value": "POS"}),
            GraphNode("target:transactions:transaction_status=DECLINED", "target", {"feature": "transaction_status", "value": "DECLINED"}),
            GraphNode("rule:transactions:fixture", "rule", {"population": "transactions"}),
        ),
        edges=(
            GraphEdge("case:C1", "population:transactions", "applies_to", {}),
            GraphEdge("value:transactions:channel=POS", "rule:transactions:fixture", "antecedent", {}),
            GraphEdge("rule:transactions:fixture", "target:transactions:transaction_status=DECLINED", "predicts", {"algorithms": ["apriori", "fpgrowth"], "support": 0.4, "confidence": 0.8, "lift": 1.6}),
        ),
    )


class LocalKgPublicationTest(unittest.TestCase):
    def test_publishes_immutable_version_and_atomic_current_pointer(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            GraphArtifactWriter().write(root / "source", "graph-fixture-2026", graph())
            pointer = publish_local_graph(root / "source" / "graph-fixture-2026", root / "target")
            self.assertEqual(pointer["tenant_id"], "demo-bankai")
            current = json.loads((root / "target" / "demo-bankai" / CURRENT_FILENAME).read_text())
            self.assertEqual(current["run_id"], "graph-fixture-2026")
            self.assertTrue((root / "target" / "demo-bankai" / "graph-fixture-2026" / "kg-operation-catalog.json").is_file())
            self.assertEqual(
                publish_local_graph(root / "source" / "graph-fixture-2026", root / "target"),
                pointer,
            )

    def test_rejects_unapproved_local_tenant(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            GraphArtifactWriter().write(root / "source", "graph-fixture-2026", graph())
            with self.assertRaisesRegex(GraphInputError, "demo-bankai"):
                publish_local_graph(root / "source" / "graph-fixture-2026", root / "target", "foreign")
