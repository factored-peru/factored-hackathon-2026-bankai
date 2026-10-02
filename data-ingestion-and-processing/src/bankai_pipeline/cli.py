"""Entry point contract for the offline pipeline.

Stage implementations are intentionally isolated from the online backend.
"""

from __future__ import annotations

import argparse


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
    args = parser.parse_args()

    selected = STAGES if args.stage == "all" else (args.stage,)
    mode = "dry-run" if args.dry_run else "execution"
    print(f"pipeline={args.run_id} mode={mode} stages={','.join(selected)}")


if __name__ == "__main__":
    main()
