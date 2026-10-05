# registry

Artifact Registry Docker repository for backend and pipeline images.
Terraform never builds images; CI (or layer `publish-image.sh` scripts) push
digests and Cloud Run pulls them.

## Resources

- `google_artifact_registry_repository` (`format = DOCKER`)
- Optional `${name_prefix}-github-ci` SA with `roles/artifactregistry.writer`
- Reader IAM for Cloud Run runtime service accounts

## WIF

Workload Identity Federation pool/provider bindings are **not** created here
(org-specific). See `deploy/docs/github-wif.md`. After apply, grant the CI SA
`roles/run.developer` and `roles/iam.serviceAccountUser` on backend/pipeline
SAs from the env composition (dev `main.tf`).
