#!/usr/bin/env python3.12
"""Run versioned Phase 1 BigQuery aggregates (P0-01 / P0-02 / P0-05)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from bankai_pipeline.phase1_baseline import (
    DEFAULT_PERIOD_END,
    DEFAULT_PERIOD_START,
    load_phase1_queries,
    run_phase1_queries,
    write_phase1_artifacts,
)


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description=(
            "Execute aggregate-only Phase 1 queries with ADC. "
            "Never prints row-level PII."
        )
    )
    parser.add_argument("--project", required=True)
    parser.add_argument("--dataset", required=True)
    parser.add_argument("--period-start", default=DEFAULT_PERIOD_START)
    parser.add_argument("--period-end", default=DEFAULT_PERIOD_END)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate and list query_ids without calling BigQuery.",
    )
    parser.add_argument(
        "--output-json",
        type=Path,
        default=Path("artifacts/phase1/phase1-baseline.json"),
    )
    parser.add_argument(
        "--output-markdown",
        type=Path,
        default=Path("docs/phase1-problem-baseline-20261004.md"),
    )
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv if argv is not None else sys.argv[1:])
    queries = load_phase1_queries()
    if args.dry_run:
        print(
            json.dumps(
                {
                    "dry_run": True,
                    "project": args.project,
                    "dataset": args.dataset,
                    "period_start": args.period_start,
                    "period_end": args.period_end,
                    "query_ids": [query.query_id for query in queries],
                },
                ensure_ascii=False,
                indent=2,
            )
        )
        return 0

    from google.cloud import bigquery

    client = bigquery.Client(project=args.project)
    payload = run_phase1_queries(
        client,
        project=args.project,
        dataset=args.dataset,
        period_start=args.period_start,
        period_end=args.period_end,
    )
    write_phase1_artifacts(
        payload,
        json_path=args.output_json,
        markdown_path=args.output_markdown,
    )
    summary = {
        "project": args.project,
        "dataset": args.dataset,
        "query_ids": list(payload["queries"]),
        "output_json": str(args.output_json),
        "output_markdown": str(args.output_markdown),
        "p0_05": payload["queries"]["p0-05-manual-resolution-baseline"]["rows"][0],
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
