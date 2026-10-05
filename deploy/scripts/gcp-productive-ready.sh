#!/usr/bin/env bash
# Preflight for productive Cloud Run path (sessions + Firestore + uploads + KG).
# Never runs terraform apply, image push, or live GCS publish.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
MODE="${1:---check}"

if [[ "$MODE" != "--check" ]]; then
  echo "usage: $0 --check" >&2
  exit 2
fi

echo "== Bankai GCP productive readiness =="
echo "repo=$ROOT mode=$MODE"

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

TF_DEV="$ROOT/deploy/terraform/environments/dev"
STATE_MOD="$ROOT/deploy/terraform/modules/state"
RUNTIME_MOD="$ROOT/deploy/terraform/modules/runtime"
REGISTRY_MOD="$ROOT/deploy/terraform/modules/registry"
EXAMPLE="$TF_DEV/terraform.tfvars.example"

echo "-- module layouts"
test -f "$STATE_MOD/main.tf"
test -f "$RUNTIME_MOD/main.tf"
test -f "$REGISTRY_MOD/main.tf"
test -f "$EXAMPLE"
test -f "$ROOT/deploy/docs/staging-flag-matrix.md"
test -f "$ROOT/deploy/docs/image-digests.md"
test -f "$ROOT/deploy/docs/state-bootstrap.md"
test -f "$ROOT/deploy/docs/github-wif.md"
test -f "$ROOT/app/backend/docs/firestore-collections.md"
test -f "$ROOT/.github/workflows/pr-checks.yml"
test -f "$ROOT/.github/workflows/publish-images.yml"

echo "-- tfvars.example staging matrix keys"
grep -q 'APP_ENV.*=.*"staging"' "$EXAMPLE"
grep -q 'DEMO_AUTH_ENABLED.*=.*"true"' "$EXAMPLE"
grep -q 'upload_bucket_name' "$EXAMPLE"
grep -q 'CHAT_ENABLED.*=.*"false"' "$EXAMPLE"
grep -q 'AGENTIC_CHAT_ENABLED.*=.*"false"' "$EXAMPLE"
grep -q 'KG_RAG_LOCAL_ENABLED.*=.*"false"' "$EXAMPLE"
grep -q '@sha256:' "$EXAMPLE"

echo "-- no secrets committed in example"
if grep -E 'SERVICE_TOKEN|PRIVATE_DATA_ENCRYPTION_KEY' "$EXAMPLE" | grep -vE '#|Secret Manager|CI' >/dev/null 2>&1; then
  # Allow comment mentions only
  :
fi
if grep -E '^\s*SERVICE_TOKEN\s*=' "$EXAMPLE" || grep -E '^\s*PRIVATE_DATA_ENCRYPTION_KEY\s*=' "$EXAMPLE"; then
  echo "secrets must not be assigned in terraform.tfvars.example" >&2
  exit 1
fi

echo "-- env wiring references in modules"
grep -q 'GCS_UPLOAD_BUCKET' "$RUNTIME_MOD/main.tf"
grep -q 'SESSION_STORE_ENABLED' "$RUNTIME_MOD/main.tf"
grep -q 'upload_bucket_name' "$RUNTIME_MOD/main.tf"
grep -q 'GCS_UPLOAD_BUCKET = var.upload_bucket_name' "$RUNTIME_MOD/main.tf"
grep -q 'google_firestore_database' "$STATE_MOD/main.tf"
grep -q 'google_redis_instance' "$STATE_MOD/main.tf"
grep -q 'google_vpc_access_connector' "$STATE_MOD/main.tf"
grep -q 'google_storage_bucket" "uploads"' "$STATE_MOD/main.tf"
grep -q 'vpc_connector_id' "$RUNTIME_MOD/main.tf"
grep -q 'google_artifact_registry_repository' "$REGISTRY_MOD/main.tf"
grep -q 'module "registry"' "$TF_DEV/main.tf"

echo "-- CI image drift guard (lifecycle ignore_changes on image)"
grep -q 'ignore_changes' "$RUNTIME_MOD/main.tf"
grep -q 'template\[0\].containers\[0\].image' "$RUNTIME_MOD/main.tf"
grep -q 'template\[0\].template\[0\].containers\[0\].image' "$RUNTIME_MOD/main.tf"

echo "-- publish-images must not clear env"
# Comments may mention the forbidden flags; only fail on non-comment command lines.
if grep -nE -- '--clear-env-vars|--set-env-vars' "$ROOT/.github/workflows/publish-images.yml" \
  | grep -vE '^[0-9]+:[[:space:]]*#' >/dev/null; then
  echo "publish-images.yml must not clear/set env vars (Terraform owns productive flags)" >&2
  exit 1
fi
grep -q 'Image only' "$ROOT/.github/workflows/publish-images.yml"

echo "-- staging matrix documents VPC + ownership"
grep -q 'Serverless VPC Access' "$ROOT/deploy/docs/staging-flag-matrix.md"
grep -q 'GCS_UPLOAD_BUCKET' "$ROOT/deploy/docs/staging-flag-matrix.md"

if command -v terraform >/dev/null 2>&1; then
  echo "-- terraform init/validate (no apply)"
  (
    cd "$TF_DEV"
    terraform init -backend=false -input=false >/dev/null
    terraform validate
  )
else
  echo "-- terraform not installed; skip validate"
fi

echo "-- Dockerfiles + layer publish scripts (build/push is separate and authorized)"
test -f "$ROOT/app/backend/Dockerfile"
test -f "$ROOT/app/backend/scripts/publish-image.sh"
test -f "$ROOT/data-ingestion-and-processing/Dockerfile"
test -f "$ROOT/data-ingestion-and-processing/scripts/publish-image.sh"

echo "OK: productive TF + registry + GHA + flag matrix ready. terraform apply / push require explicit authorization."
