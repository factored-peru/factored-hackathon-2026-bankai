#!/usr/bin/env bash
# Preflight for the minimum GCP path: KG bucket publish + backend reader.
# Does NOT terraform apply or publish without --execute (still needs ADC + auth).
# Cloud path never builds images; use --build-local to delegate to layer scripts.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:---check}"

echo "== Bankai GCP KG readiness =="
echo "repo=$ROOT mode=$MODE"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

PIPELINE_DIR="$ROOT/data-ingestion-and-processing"
BACKEND_DIR="$ROOT/app/backend"
TF_DEV="$ROOT/deploy/terraform/environments/dev"

echo "-- Dockerfile pipeline"
test -f "$PIPELINE_DIR/Dockerfile"
test -x "$PIPELINE_DIR/scripts/publish-image.sh" || test -f "$PIPELINE_DIR/scripts/publish-image.sh"
echo "-- Dockerfile backend"
test -f "$BACKEND_DIR/Dockerfile"
test -f "$BACKEND_DIR/scripts/publish-image.sh"

if [[ "$MODE" == "--build-local" ]]; then
  need docker
  echo "-- build images via layer scripts local tags, no push"
  bash "$PIPELINE_DIR/scripts/publish-image.sh" --build-local
  bash "$BACKEND_DIR/scripts/publish-image.sh" --build-local
elif [[ "$MODE" == "--check" || "$MODE" == "--dry-run-publish" || "$MODE" == "--execute" ]]; then
  echo "-- skip docker build; deploy does not build for cloud"
  echo "-- use --build-local or layer scripts/publish-image.sh"
else
  echo "usage: $0 --check | --build-local | --dry-run-publish | --execute" >&2
  exit 2
fi

if command -v terraform >/dev/null 2>&1; then
  echo "-- terraform init/validate (no apply)"
  terraform -chdir="$TF_DEV" init -backend=false -input=false >/dev/null
  terraform -chdir="$TF_DEV" validate
else
  echo "-- terraform not installed; skip validate"
fi

GRAPH_DIR="${GRAPH_ARTIFACT_DIR:-}"
if [[ -z "$GRAPH_DIR" ]]; then
  CANDIDATE="$(find "$PIPELINE_DIR/artifacts/graph" -maxdepth 1 -type d -name 'graph-*' 2>/dev/null | sort | tail -1 || true)"
  GRAPH_DIR="$CANDIDATE"
fi

if [[ -n "${GRAPH_DIR}" && -d "${GRAPH_DIR}" ]]; then
  echo "-- graph artifact: $GRAPH_DIR"
  if [[ "$MODE" == "--dry-run-publish" || "$MODE" == "--execute" ]]; then
    need python3
    # shellcheck disable=SC1091
    if [[ -f "$PIPELINE_DIR/.venv/bin/activate" ]]; then
      # shellcheck disable=SC1091
      source "$PIPELINE_DIR/.venv/bin/activate"
    fi
    RUN_ID="$(basename "$GRAPH_DIR")"
    BUCKET="${GCS_GRAPH_BUCKET:-}"
    if [[ -z "$BUCKET" ]]; then
      echo "GCS_GRAPH_BUCKET is required for publish dry-run/execute" >&2
      exit 1
    fi
    ARGS=(
      --stage publish
      --run-id "$RUN_ID"
      --publish-backend gcs
      --graph-artifact-dir "$GRAPH_DIR"
      --gcs-bucket "$BUCKET"
      --kg-tenant-id "${GCS_GRAPH_TENANT_ID:-demo-bankai}"
      --gcs-prefix "${GCS_GRAPH_ARTIFACT_PREFIX:-}"
    )
    if [[ "$MODE" != "--execute" ]]; then
      ARGS+=(--dry-run)
      echo "-- publish GCS dry-run (no writes)"
    else
      echo "-- publish GCS EXECUTE (writes objects + current.json; requires lease)"
    fi
    (cd "$PIPELINE_DIR" && bankai-pipeline "${ARGS[@]}")
  fi
else
  echo "-- no local graph artifact; compile-graph first or set GRAPH_ARTIFACT_DIR"
fi

echo "== ready checklist =="
echo "1. terraform apply (authorized) with real image digests from Artifact Registry"
echo "2. push via app/backend/scripts/publish-image.sh --push and pipeline scripts/publish-image.sh --push"
echo "3. GCS_ENABLED=true GCS_GRAPH_BUCKET=<bucket> on Cloud Run"
echo "4. bankai-pipeline publish --publish-backend gcs (or re-run this script --execute)"
echo "5. smoke: backend knowledgeGraphRuntime loads {tenant}/current.json"
