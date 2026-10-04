"""Entry point contract for the offline pipeline.

Stage implementations are intentionally isolated from the online backend.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from bankai_pipeline.c1 import dry_run_plan as c1_dry_run_plan
from bankai_pipeline.c1 import load_config as load_c1_config
from bankai_pipeline.c1 import run_c1
from bankai_pipeline.c2 import dry_run_plan as c2_dry_run_plan
from bankai_pipeline.c2 import load_config as load_c2_config
from bankai_pipeline.c2 import run_c2
from bankai_pipeline.c3 import dry_run_plan as c3_dry_run_plan
from bankai_pipeline.c3 import load_config as load_c3_config
from bankai_pipeline.c3 import run as run_c3
from bankai_pipeline.c4 import dry_run_plan as c4_dry_run_plan
from bankai_pipeline.c4 import load_config as load_c4_config
from bankai_pipeline.c4 import run as run_c4
from bankai_pipeline.c5 import dry_run_plan as c5_dry_run_plan
from bankai_pipeline.c5 import load_config as load_c5_config
from bankai_pipeline.c5 import run as run_c5
from bankai_pipeline.dispute_contracts import CONTRACTS
from bankai_pipeline.graph import compile_graph, graph_dry_run_plan
from bankai_pipeline.kdd import dry_run_plan, load_config, run_kdd
from bankai_pipeline.suite import build as build_suite


STAGES = (
    "transfer",
    "load",
    "prepare",
    "kdd",
    "train-naive-bayes",
    "train-resolution-baseline",
    "train-fraud-baseline",
    "train-interaction-risk",
    "train-satisfaction-ordinal",
    "evaluate-supervised-suite",
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
    parser.add_argument(
        "--c1-config",
        type=Path,
        help="Versioned TOML configuration required when --stage train-naive-bayes executes C1.",
    )
    parser.add_argument(
        "--c2-config",
        type=Path,
        help="Versioned TOML configuration required when --stage train-resolution-baseline executes C2.",
    )
    parser.add_argument("--c3-config", type=Path)
    parser.add_argument("--c4-config", type=Path)
    parser.add_argument("--c5-config", type=Path)
    parser.add_argument("--c1-artifact-dir", type=Path)
    parser.add_argument("--c2-artifact-dir", type=Path)
    parser.add_argument("--c3-artifact-dir", type=Path)
    parser.add_argument("--c4-artifact-dir", type=Path)
    parser.add_argument("--c5-artifact-dir", type=Path)
    parser.add_argument("--suite-output-dir", type=Path, default=Path("artifacts/supervised-suite"))
    parser.add_argument(
        "--kdd-artifact-dir",
        type=Path,
        help="Local KDD run directory required when --stage compile-graph is executed.",
    )
    parser.add_argument(
        "--graph-output-dir",
        type=Path,
        default=Path("artifacts/graph"),
        help="Local graph artifact root; publish remains a separate stage.",
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

    if args.stage == "compile-graph":
        if args.kdd_artifact_dir is None:
            parser.error("--kdd-artifact-dir is required for --stage compile-graph")
        if args.dry_run:
            print(
                json.dumps(
                    graph_dry_run_plan(
                        args.kdd_artifact_dir, args.graph_output_dir, args.run_id
                    ),
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            return
        manifest = compile_graph(
            args.kdd_artifact_dir, args.graph_output_dir, args.run_id
        )
        print(json.dumps(manifest, ensure_ascii=False, sort_keys=True))
        return

    if args.stage == "train-naive-bayes":
        if args.c1_config is None:
            parser.error("--c1-config is required for --stage train-naive-bayes")
        config = load_c1_config(args.c1_config)
        if args.dry_run:
            print(json.dumps(c1_dry_run_plan(config), ensure_ascii=False, sort_keys=True))
            return
        from google.cloud import bigquery

        manifest = run_c1(
            config,
            args.run_id,
            bigquery.Client(project=config.project),
        )
        print(json.dumps(manifest, ensure_ascii=False, sort_keys=True))
        return

    if args.stage == "train-resolution-baseline":
        if args.c2_config is None:
            parser.error("--c2-config is required for --stage train-resolution-baseline")
        config = load_c2_config(args.c2_config)
        if args.dry_run:
            print(json.dumps(c2_dry_run_plan(config), ensure_ascii=False, sort_keys=True))
            return
        from google.cloud import bigquery

        manifest = run_c2(
            config,
            args.run_id,
            bigquery.Client(project=config.project),
        )
        print(json.dumps(manifest, ensure_ascii=False, sort_keys=True))
        return

    cases = {
        "train-fraud-baseline": ("--c3-config", args.c3_config, load_c3_config, c3_dry_run_plan, run_c3),
        "train-interaction-risk": ("--c4-config", args.c4_config, load_c4_config, c4_dry_run_plan, run_c4),
        "train-satisfaction-ordinal": ("--c5-config", args.c5_config, load_c5_config, c5_dry_run_plan, run_c5),
    }
    if args.stage in cases:
        option, path, loader, planner, runner = cases[args.stage]
        if path is None:
            parser.error(f"{option} is required")
        config = loader(path)
        if args.dry_run:
            print(json.dumps(planner(config), ensure_ascii=False, sort_keys=True))
            return
        from google.cloud import bigquery
        print(json.dumps(runner(config, args.run_id, bigquery.Client(project=config.project)), ensure_ascii=False, sort_keys=True))
        return

    if args.stage == "evaluate-supervised-suite":
        directories = {"C1": args.c1_artifact_dir, "C2": args.c2_artifact_dir, "C3": args.c3_artifact_dir, "C4": args.c4_artifact_dir, "C5": args.c5_artifact_dir}
        if any(value is None for value in directories.values()):
            parser.error("all --cN-artifact-dir values are required for evaluate-supervised-suite")
        if args.dry_run:
            print(json.dumps({"cases": sorted(directories), "publication": "not_requested"}, sort_keys=True))
            return
        print(json.dumps(build_suite(directories, args.suite_output_dir, args.run_id), ensure_ascii=False, sort_keys=True))
        return

    selected = STAGES if args.stage == "all" else (args.stage,)
    mode = "dry-run" if args.dry_run else "execution"
    print(
        f"pipeline={args.run_id} mode={mode} stages={','.join(selected)} "
        f"contracts={','.join(CONTRACTS)}"
    )


if __name__ == "__main__":
    main()
