"""Tests for local/GCS KG publication and Firestore lease ownership."""

from __future__ import annotations

import json
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory

from bankai_pipeline.gcs_publication import gcs_publication_dry_run, publish_gcs_graph
from bankai_pipeline.graph import CompiledGraph, GraphArtifactWriter, GraphEdge, GraphInputError, GraphNode
from bankai_pipeline.kg_publication import CURRENT_FILENAME, package_object_names, publish_local_graph
from bankai_pipeline.pipeline_lease import InMemoryPipelineLease, PipelineLeaseError


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
            GraphEdge(
                "rule:transactions:fixture",
                "target:transactions:transaction_status=DECLINED",
                "predicts",
                {"algorithms": ["apriori", "fpgrowth", "eclat"], "support": 0.4, "confidence": 0.8, "lift": 1.6},
            ),
        ),
    )


class _FakeBlob:
    def __init__(self, store: dict[str, bytes], name: str) -> None:
        self._store = store
        self._name = name

    def exists(self) -> bool:
        return self._name in self._store

    def download_as_bytes(self) -> bytes:
        return self._store[self._name]

    def upload_from_string(
        self, data: bytes, *, content_type: str, if_generation_match: int | None = None
    ) -> None:
        del content_type
        if if_generation_match == 0 and self._name in self._store:
            raise RuntimeError("precondition failed")
        self._store[self._name] = data


class _FakeBucket:
    def __init__(self, store: dict[str, bytes]) -> None:
        self._store = store

    def blob(self, name: str) -> _FakeBlob:
        return _FakeBlob(self._store, name)


class _FakeClient:
    def __init__(self, store: dict[str, bytes]) -> None:
        self._store = store

    def bucket(self, name: str) -> _FakeBucket:
        del name
        return _FakeBucket(self._store)


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


class GcsKgPublicationTest(unittest.TestCase):
    def test_dry_run_lists_object_names_without_writing(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            GraphArtifactWriter().write(root / "source", "graph-fixture-2026", graph())
            plan = gcs_publication_dry_run(
                root / "source" / "graph-fixture-2026",
                bucket_name="kg-artifacts",
                tenant_id="demo-bankai",
                prefix="knowledge-graph",
            )
            self.assertEqual(plan["publication"], "gcs_not_requested")
            self.assertEqual(
                plan["objects"],
                package_object_names("demo-bankai", "graph-fixture-2026", prefix="knowledge-graph"),
            )

    def test_publish_requires_lease_and_writes_immutable_package(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            GraphArtifactWriter().write(root / "source", "graph-fixture-2026", graph())
            store: dict[str, bytes] = {}
            lease = InMemoryPipelineLease()
            handle = lease.acquire("demo-bankai", "graph-fixture-2026")
            pointer = publish_gcs_graph(
                root / "source" / "graph-fixture-2026",
                bucket_name="kg-artifacts",
                tenant_id="demo-bankai",
                lease=lease,
                lease_handle=handle,
                client=_FakeClient(store),
            )
            self.assertEqual(pointer["publication"], "gcs")
            names = package_object_names("demo-bankai", "graph-fixture-2026")
            self.assertIn(names["graph-v1.msgpack"], store)
            self.assertIn(names["current.json"], store)
            # Idempotent re-upload of the same package
            publish_gcs_graph(
                root / "source" / "graph-fixture-2026",
                bucket_name="kg-artifacts",
                tenant_id="demo-bankai",
                lease=lease,
                lease_handle=handle,
                client=_FakeClient(store),
            )

    def test_publish_aborts_without_lease_owner(self) -> None:
        with TemporaryDirectory() as temporary:
            root = Path(temporary)
            GraphArtifactWriter().write(root / "source", "graph-fixture-2026", graph())
            lease = InMemoryPipelineLease()
            owner = lease.acquire("demo-bankai", "graph-fixture-2026")
            lease.release(owner)
            with self.assertRaises(PipelineLeaseError):
                publish_gcs_graph(
                    root / "source" / "graph-fixture-2026",
                    bucket_name="kg-artifacts",
                    tenant_id="demo-bankai",
                    lease=lease,
                    lease_handle=owner,
                    client=_FakeClient({}),
                )


class PipelineLeaseTest(unittest.TestCase):
    def test_exclusive_owner_and_version(self) -> None:
        lease = InMemoryPipelineLease()
        first = lease.acquire("demo-bankai", "run-a-20261004")
        with self.assertRaises(PipelineLeaseError):
            lease.acquire("demo-bankai", "run-b-20261004")
        refreshed = lease.heartbeat(first)
        self.assertEqual(refreshed.version, first.version + 1)
        lease.release(refreshed)
        second = lease.acquire("demo-bankai", "run-b-20261004")
        self.assertEqual(second.owner_run_id, "run-b-20261004")
