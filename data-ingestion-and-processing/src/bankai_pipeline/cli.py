"""Entry point contract for the offline pipeline.

Stage implementations are intentionally isolated from the online backend.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from bankai_pipeline.dispute_contracts import CONTRACTS
from bankai_pipeline.kdd import dry_run_plan, load_config, run_kdd


STAGES = (
    "transfer",
    "load",
    "prepare",
    "kdd",
    "train-naive-bayes",
    "compile-graph",
    "publish",
)


def main() -> None:
    parser = argparse.ArgumentParser(description="Bankai offline pipeline")
    parser.add_argument("--stage", choices=(*STAGES, "all"), default="all")
    parser.add_argument("--run-id", required=True)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--kdd-config",
        type=Path,
        help="Versioned TOML configuration required when --stage kdd is executed.",
    )
    args = parser.parse_args()

    if args.stage == "kdd":
        if args.kdd_config is None:
            parser.error("--kdd-config is required for --stage kdd")
        config = load_config(args.kdd_config)
        if args.dry_run:
            print(json.dumps(dry_run_plan(config), ensure_ascii=False, sort_keys=True))
            return
        from google.cloud import bigquery

        manifest = run_kdd(
            config,
            args.run_id,
            bigquery.Client(project=config.project),
        )
        print(json.dumps(manifest, ensure_ascii=False, sort_keys=True))
        return

    selected = STAGES if args.stage == "all" else (args.stage,)
    mode = "dry-run" if args.dry_run else "execution"
    print(
        f"pipeline={args.run_id} mode={mode} stages={','.join(selected)} "
        f"contracts={','.join(CONTRACTS)}"
    )


if __name__ == "__main__":
    main()
