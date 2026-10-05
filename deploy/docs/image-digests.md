# Image digests (commit freeze)

Cloud Run and the pipeline Job must run **digest-pinned** images, never
`:latest` in staging/prod.

## Canonical form

```text
REGION-docker.pkg.dev/PROJECT/bankai/backend@sha256:…
REGION-docker.pkg.dev/PROJECT/bankai/pipeline@sha256:…
```

Mutable tags (`:GIT_SHA`, optionally `:latest` on main) exist only to make
`docker push` ergonomic. The value written to Terraform `backend_image` /
`pipeline_image`, CI artifacts, and `gcloud run … --image` is the **digest**.

## Who produces digests

| Actor | Command |
| --- | --- |
| Backend layer | `app/backend/scripts/publish-image.sh --push` |
| Pipeline layer | `data-ingestion-and-processing/scripts/publish-image.sh --push` |
| GitHub Actions | `.github/workflows/publish-images.yml` (artifact `image-digests-<sha>`) |

Images are labeled with `git.sha` / `org.opencontainers.image.revision`.

## Who consumes digests

| Actor | Behavior |
| --- | --- |
| Terraform `runtime` | First apply needs real digests in tfvars; afterwards `lifecycle.ignore_changes` on container `image` so apply does not revert CI digests |
| GitHub Actions | After push, updates Cloud Run service/job **image only** if it exists |
| `deploy/` | Never builds for cloud; only validate/plan/apply infra |

**Split of ownership**

- **Terraform:** env (`GCS_UPLOAD_*`, `FIRESTORE_*`, `KV_*`, `GCS_GRAPH_BUCKET`), Serverless VPC Access connector, IAM, buckets.
- **CI:** image digest via `gcloud run services update --image` / `jobs update --image`. Never `--clear-env-vars` or `--set-env-vars` that overwrite productive flags.

## First-time bootstrap

1. `terraform apply` (authorized) creates Artifact Registry + Cloud Run with
   digests from tfvars and injects productive flags from `state`.
2. Subsequent app merges: CI pushes + updates revisions; no full apply (image
   ignored by TF lifecycle).
3. Infra / flag changes: human-authorized `terraform plan` / `apply` only.

See [github-wif.md](github-wif.md) and [state-bootstrap.md](state-bootstrap.md).
