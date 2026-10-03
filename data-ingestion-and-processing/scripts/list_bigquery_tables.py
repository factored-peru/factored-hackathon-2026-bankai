#!/usr/bin/env python3.12
"""List BigQuery table metadata without reading table rows or schemas."""

from __future__ import annotations

import argparse
import json
import sys
from collections.abc import Iterable
from typing import Protocol


class TableListItem(Protocol):
    """Subset of BigQuery metadata intentionally safe to print."""

    dataset_id: str
    table_id: str
    table_type: str | None


class BigQueryMetadataClient(Protocol):
    """Read-only metadata operations required by this utility."""

    def list_datasets(self, *, project: str) -> Iterable[object]: ...

    def list_tables(self, dataset: object) -> Iterable[TableListItem]: ...


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="List BigQuery dataset/table identifiers using Application Default Credentials."
    )
    parser.add_argument("--project", required=True, help="Google Cloud project ID.")
    parser.add_argument(
        "--dataset",
        action="append",
        default=[],
        help="Optional dataset ID to inspect; repeat to restrict the scope.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the intended scope without making a Google Cloud API request.",
    )
    return parser.parse_args(argv)


def list_table_metadata(
    client: BigQueryMetadataClient,
    project: str,
    requested_datasets: list[str],
) -> list[dict[str, str | None]]:
    allowed_datasets = set(requested_datasets)
    rows: list[dict[str, str | None]] = []
    for dataset in client.list_datasets(project=project):
        dataset_id = getattr(dataset, "dataset_id", None)
        if not isinstance(dataset_id, str):
            continue
        if allowed_datasets and dataset_id not in allowed_datasets:
            continue
        for table in client.list_tables(dataset):
            rows.append(
                {
                    "dataset_id": dataset_id,
                    "table_id": table.table_id,
                    "table_type": table.table_type,
                }
            )
    return sorted(
        rows,
        key=lambda item: (item["dataset_id"] or "", item["table_id"] or ""),
    )


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    if args.dry_run:
        scope = args.dataset if args.dataset else ["all visible datasets"]
        print(json.dumps({"project": args.project, "datasets": scope, "dry_run": True}))
        return 0

    from google.cloud import bigquery

    client = bigquery.Client(project=args.project)
    rows = list_table_metadata(client, args.project, args.dataset)
    print(json.dumps(rows, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
