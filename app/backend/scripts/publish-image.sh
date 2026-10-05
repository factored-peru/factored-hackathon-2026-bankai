#!/usr/bin/env bash
# Build (and optionally push) the backend image. Owned by app/backend — not deploy/.
# Prints the immutable digest ref on stdout when pushing.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MODE="build"
GIT_SHA="${GIT_SHA:-$(git -C "$ROOT/../.." rev-parse --short=12 HEAD 2>/dev/null || echo local)}"
PROJECT_ID="${GCP_PROJECT_ID:-${PROJECT_ID:-}}"
REGION="${GCP_REGION:-${REGION:-us-central1}}"
REPOSITORY="${ARTIFACT_REPOSITORY:-bankai}"
IMAGE_NAME="backend"
LOCAL_TAG="${LOCAL_TAG:-bankai-backend:local}"
PUSH_LATEST=0

usage() {
  cat <<'EOF'
usage: scripts/publish-image.sh [--build-local | --push] [--git-sha SHA]

  --build-local   docker build only (default); tags bankai-backend:local
  --push          build, tag with GIT_SHA, push to Artifact Registry, print digest
  --git-sha SHA   override commit label (default: git rev-parse)

Env for --push: GCP_PROJECT_ID (or PROJECT_ID), GCP_REGION, ARTIFACT_REPOSITORY
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build-local) MODE="build" ;;
    --push) MODE="push" ;;
    --git-sha)
      GIT_SHA="$2"
      shift
      ;;
    --latest) PUSH_LATEST=1 ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "unknown arg: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

need() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "missing command: $1" >&2
    exit 1
  }
}

need docker

echo "== backend publish-image mode=$MODE git_sha=$GIT_SHA ==" >&2
docker build \
  --label "git.sha=${GIT_SHA}" \
  --label "org.opencontainers.image.revision=${GIT_SHA}" \
  -t "$LOCAL_TAG" \
  "$ROOT"

if [[ "$MODE" == "build" ]]; then
  echo "built $LOCAL_TAG (no push)" >&2
  exit 0
fi

if [[ -z "$PROJECT_ID" ]]; then
  echo "GCP_PROJECT_ID or PROJECT_ID is required for --push" >&2
  exit 1
fi

need gcloud
PREFIX="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${IMAGE_NAME}"
SHA_TAG="${PREFIX}:${GIT_SHA}"

gcloud auth configure-docker "${REGION}-docker.pkg.dev" --quiet >&2
docker tag "$LOCAL_TAG" "$SHA_TAG"
docker push "$SHA_TAG" >&2

if [[ "$PUSH_LATEST" -eq 1 ]]; then
	docker tag "$LOCAL_TAG" "${PREFIX}:latest"
	docker push "${PREFIX}:latest" >&2
fi

DIGEST="$(docker image inspect "$SHA_TAG" --format '{{index .RepoDigests 0}}' 2>/dev/null || true)"
if [[ -z "$DIGEST" ]]; then
  DIGEST="$(gcloud artifacts docker images describe "$SHA_TAG" --format='get(image_summary.digest)' 2>/dev/null || true)"
  if [[ -n "$DIGEST" && "$DIGEST" != *@* ]]; then
    DIGEST="${PREFIX}@${DIGEST}"
  fi
fi

if [[ -z "$DIGEST" ]]; then
  echo "push succeeded but digest lookup failed; use ${SHA_TAG} and resolve digest manually" >&2
  echo "$SHA_TAG"
  exit 0
fi

# Sole stdout line for CI capture
echo "$DIGEST"
