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
from bankai_pipeline.graph_diff import (
    DiffGateConfig,
    assert_diff_gate_passed,
    dry_run_plan as graph_diff_dry_run_plan,
    run_graph_diff,
)
from bankai_pipeline.gcs_publication import gcs_publication_dry_run, publish_gcs_graph
from bankai_pipeline.ingestion_cloud import load_dry_run_plan, transfer_dry_run_plan
from bankai_pipeline.kg_publication import local_publication_dry_run, prepare_publication, publish_local_graph
from bankai_pipeline.pipeline_lease import DEFAULT_LEASE_TTL_SECONDS, FirestorePipelineLease
from bankai_pipeline.kdd import dry_run_plan, load_config, run_kdd
from bankai_pipeline.metrics_report import dry_run_plan as metrics_dry_run_plan
from bankai_pipeline.metrics_report import run_report
from bankai_pipeline.preparation import preparation_dry_run_plan
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
    "graph-diff",
    "publish",
    "report-metrics",
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
    parser.add_argument("--supervised-suite-artifact-dir", type=Path)
    parser.add_argument(
        "--graph-artifact-dir",
        type=Path,
        help="Compiled graph directory required when --stage publish is executed.",
    )
    parser.add_argument(
        "--publish-backend",
        choices=("local", "gcs"),
        default="local",
        help="KG publication destination; gcs requires a Firestore lease before current.json.",
    )
    parser.add_argument(
        "--local-target",
        type=Path,
        help="Local KG publication root required when --publish-backend local.",
    )
    parser.add_argument(
        "--gcs-bucket",
        help="GCS bucket for immutable KG packages when --publish-backend gcs.",
    )
    parser.add_argument(
        "--gcs-prefix",
        default="",
        help="Optional object prefix inside the KG bucket (default empty).",
    )
    parser.add_argument(
        "--lease-ttl-seconds",
        type=int,
        default=DEFAULT_LEASE_TTL_SECONDS,
        help="Firestore lease TTL for GCS publish ownership.",
    )
    parser.add_argument("--kg-tenant-id", default="demo-bankai")
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
    parser.add_argument(
        "--report-output-dir",
        type=Path,
        default=Path("artifacts/reports"),
        help="Local interpretability report root for --stage report-metrics.",
    )
    parser.add_argument(
        "--previous-kdd-artifact-dir",
        type=Path,
        help="Previous KDD run directory for --stage graph-diff.",
    )
    parser.add_argument(
        "--candidate-kdd-artifact-dir",
        type=Path,
        help="Candidate KDD run directory for --stage graph-diff.",
    )
    parser.add_argument(
        "--diff-output",
        type=Path,
        help="Path or directory for graph-diff JSON report.",
    )
    parser.add_argument(
        "--diff-report",
        type=Path,
        help="Existing graph-diff report required when --require-diff-pass is set.",
    )
    parser.add_argument(
        "--require-diff-pass",
        action="store_true",
        help="Fail closed on publish unless --diff-report gate.passed is true.",
    )
    parser.add_argument("--min-jaccard", type=float, default=0.5)
    parser.add_argument("--max-removed-ratio", type=float, default=0.5)
    parser.add_argument("--max-added-ratio", type=float, default=0.5)
    parser.add_argument("--max-row-count-delta-ratio", type=float, default=0.25)
    parser.add_argument("--min-holdout-stable-fraction", type=float, default=0.5)
    args = parser.parse_args()

    if args.stage == "prepare":
        if not args.dry_run:
            parser.error(
                "prepare cloud execution is unavailable until the ADR 0020 ingestion worker "
                "has accepted a verified object and recorded the ledger"
            )
        print(
            json.dumps(
                preparation_dry_run_plan(tuple(CONTRACTS.values())),
                ensure_ascii=False,
                sort_keys=True,
            )
        )
        return

    if args.stage == "transfer":
        if not args.dry_run:
            parser.error(
                "transfer requires Storage Transfer Service and the reconciler; "
                "use --dry-run until P0-37 cloud resources are authorized"
            )
        print(json.dumps(transfer_dry_run_plan(), ensure_ascii=False, sort_keys=True))
        return

    if args.stage == "load":
        if not args.dry_run:
            parser.error(
                "load requires Eventarc/Cloud Tasks/ingestion-worker; "
                "use --dry-run until P0-37 cloud resources are authorized"
            )
        print(json.dumps(load_dry_run_plan(), ensure_ascii=False, sort_keys=True))
        return

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
        case_dirs = {
            "C1": args.c1_artifact_dir,
            "C2": args.c2_artifact_dir,
            "C3": args.c3_artifact_dir,
            "C4": args.c4_artifact_dir,
            "C5": args.c5_artifact_dir,
        }
        supplied_cases = [value is not None for value in case_dirs.values()]
        if args.supervised_suite_artifact_dir is None and any(supplied_cases):
            parser.error("--supervised-suite-artifact-dir is required with case artifacts")
        if args.supervised_suite_artifact_dir is not None and not all(supplied_cases):
            parser.error("all --cN-artifact-dir values are required with --supervised-suite-artifact-dir")
        suite = args.supervised_suite_artifact_dir
        artifacts = case_dirs if suite is not None else None
        if args.dry_run:
            print(
                json.dumps(
                    graph_dry_run_plan(
                        args.kdd_artifact_dir, args.graph_output_dir, args.run_id, suite, artifacts
                    ),
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            return
        manifest = compile_graph(
            args.kdd_artifact_dir, args.graph_output_dir, args.run_id, suite, artifacts
        )
        print(json.dumps(manifest, ensure_ascii=False, sort_keys=True))
        return

    if args.stage == "graph-diff":
        if args.previous_kdd_artifact_dir is None or args.candidate_kdd_artifact_dir is None:
            parser.error(
                "--previous-kdd-artifact-dir and --candidate-kdd-artifact-dir "
                "are required for --stage graph-diff"
            )
        gate = DiffGateConfig(
            min_jaccard=args.min_jaccard,
            max_removed_ratio=args.max_removed_ratio,
            max_added_ratio=args.max_added_ratio,
            max_row_count_delta_ratio=args.max_row_count_delta_ratio,
            min_holdout_stable_fraction=args.min_holdout_stable_fraction,
        )
        if args.dry_run:
            print(
                json.dumps(
                    graph_diff_dry_run_plan(
                        args.previous_kdd_artifact_dir,
                        args.candidate_kdd_artifact_dir,
                        args.diff_output,
                        gate,
                    ),
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            return
        report = run_graph_diff(
            args.previous_kdd_artifact_dir,
            args.candidate_kdd_artifact_dir,
            gate=gate,
            output=args.diff_output,
        )
        print(json.dumps(report, ensure_ascii=False, sort_keys=True))
        return

    if args.stage == "publish":
        if args.require_diff_pass:
            if args.diff_report is None:
                parser.error("--diff-report is required with --require-diff-pass")
            assert_diff_gate_passed(args.diff_report)
        if args.graph_artifact_dir is None:
            parser.error("--graph-artifact-dir is required for --stage publish")
        if args.publish_backend == "local":
            if args.local_target is None:
                parser.error("--local-target is required for --publish-backend local")
            if args.dry_run:
                print(
                    json.dumps(
                        local_publication_dry_run(
                            args.graph_artifact_dir, args.local_target, args.kg_tenant_id
                        ),
                        ensure_ascii=False,
                        sort_keys=True,
                    )
                )
                return
            pointer = publish_local_graph(
                args.graph_artifact_dir, args.local_target, args.kg_tenant_id
            )
            print(json.dumps(pointer, ensure_ascii=False, sort_keys=True))
            return
        if not args.gcs_bucket:
            parser.error("--gcs-bucket is required for --publish-backend gcs")
        if args.dry_run:
            print(
                json.dumps(
                    gcs_publication_dry_run(
                        args.graph_artifact_dir,
                        bucket_name=args.gcs_bucket,
                        tenant_id=args.kg_tenant_id,
                        prefix=args.gcs_prefix,
                    ),
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            return
        from google.cloud import firestore

        prepared = prepare_publication(args.graph_artifact_dir, args.kg_tenant_id)
        lease = FirestorePipelineLease(firestore.Client())
        handle = lease.acquire(
            args.kg_tenant_id,
            prepared.run_id,
            ttl_seconds=args.lease_ttl_seconds,
        )
        try:
            pointer = publish_gcs_graph(
                args.graph_artifact_dir,
                bucket_name=args.gcs_bucket,
                tenant_id=args.kg_tenant_id,
                lease=lease,
                lease_handle=handle,
                prefix=args.gcs_prefix,
            )
        finally:
            lease.release(handle)
        print(json.dumps(pointer, ensure_ascii=False, sort_keys=True))
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

    if args.stage == "report-metrics":
        if args.kdd_artifact_dir is None or args.supervised_suite_artifact_dir is None:
            parser.error(
                "--kdd-artifact-dir and --supervised-suite-artifact-dir are required "
                "for --stage report-metrics"
            )
        case_dirs = {
            "C1": args.c1_artifact_dir,
            "C2": args.c2_artifact_dir,
            "C3": args.c3_artifact_dir,
            "C4": args.c4_artifact_dir,
            "C5": args.c5_artifact_dir,
        }
        if any(value is None for value in case_dirs.values()):
            parser.error("all --cN-artifact-dir values are required for --stage report-metrics")
        output_dir = args.report_output_dir / args.run_id
        if args.dry_run:
            print(
                json.dumps(
                    metrics_dry_run_plan(
                        run_id=args.run_id,
                        kdd_dir=args.kdd_artifact_dir,
                        suite_dir=args.supervised_suite_artifact_dir,
                        case_dirs=case_dirs,
                        graph_dir=args.graph_artifact_dir,
                        output_dir=output_dir,
                    ),
                    ensure_ascii=False,
                    sort_keys=True,
                )
            )
            return
        summary = run_report(
            run_id=args.run_id,
            output_dir=output_dir,
            kdd_dir=args.kdd_artifact_dir,
            suite_dir=args.supervised_suite_artifact_dir,
            case_dirs=case_dirs,
            graph_dir=args.graph_artifact_dir,
        )
        print(json.dumps(summary, ensure_ascii=False, sort_keys=True))
        return

    selected = STAGES if args.stage == "all" else (args.stage,)
    mode = "dry-run" if args.dry_run else "execution"
    print(
        f"pipeline={args.run_id} mode={mode} stages={','.join(selected)} "
        f"contracts={','.join(CONTRACTS)}"
    )


if __name__ == "__main__":
    main()
