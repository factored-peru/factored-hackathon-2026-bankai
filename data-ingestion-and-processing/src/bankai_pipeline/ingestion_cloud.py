"""Declared ADR 0020 ingest stages that remain cloud-worker owned.

``transfer`` and ``load`` are not executed from the local CLI: they require
Storage Transfer Service, Eventarc, Cloud Tasks and the ingestion worker.
These helpers only describe the contract for dry-run / Job planning.
"""

from __future__ import annotations


def transfer_dry_run_plan() -> dict[str, object]:
    return {
        "stage": "transfer",
        "status": "not_implemented_locally",
        "requires": [
            "Storage Transfer Service S3->GCS/raw",
            "reconciler Cloud Run Function",
            "15m Scheduler + 30m lookback",
        ],
        "effect": "none",
        "publication": "not_requested",
    }


def load_dry_run_plan() -> dict[str, object]:
    return {
        "stage": "load",
        "status": "not_implemented_locally",
        "requires": [
            "GCS object.finalized -> Eventarc",
            "ingestion-dispatcher + Cloud Tasks OIDC",
            "ingestion-worker verified/ + BigQuery raw + ingestion_ledger",
        ],
        "effect": "none",
        "publication": "not_requested",
    }
