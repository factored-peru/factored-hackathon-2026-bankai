# GitHub Actions → GCP (Workload Identity Federation)

CI never stores a JSON service-account key. Bind the GitHub OIDC token to the
Terraform-created `${name_prefix}-github-ci` SA (`module.registry`).

## Repo / Environment variables

Put these on the GitHub **Environment** `ci-cd-factored` (Settings →
Environments), which `publish-images.yml` references via `environment:`.
Repository-level Actions variables alone are **not** read by that workflow.

| Variable | Example |
| --- | --- |
| `GCP_PROJECT_ID` | `factored-hackathon` |
| `GCP_REGION` | `us-central1` |
| `ARTIFACT_REPOSITORY` | `bankai` (optional; default) |
| `NAME_PREFIX` | `bankai` (optional; default) |
| `WIF_PROVIDER` | `projects/PROJECT_NUMBER/locations/global/workloadIdentityPools/POOL/providers/PROVIDER` |
| `WIF_SERVICE_ACCOUNT` | `bankai-github-ci@PROJECT.iam.gserviceaccount.com` |

## One-time WIF setup (ops; not in Terraform yet)

```bash
PROJECT_ID=…
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
POOL=bankai-github
PROVIDER=github
SA=bankai-github-ci@${PROJECT_ID}.iam.gserviceaccount.com
REPO=OWNER/REPO   # e.g. factoredai/factored-hackathon-2026-bankai

gcloud iam workload-identity-pools create "$POOL" \
  --project="$PROJECT_ID" --location=global --display-name="Bankai GitHub"

gcloud iam workload-identity-pools providers create-oidc "$PROVIDER" \
  --project="$PROJECT_ID" --location=global \
  --workload-identity-pool="$POOL" \
  --display-name="GitHub" \
  --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository,attribute.ref=assertion.ref" \
  --issuer-uri="https://token.actions.githubusercontent.com" \
  --attribute-condition="assertion.repository=='${REPO}'"

gcloud iam service-accounts add-iam-policy-binding "$SA" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${POOL}/attribute.repository/${REPO}"
```

Set `WIF_PROVIDER` to the full provider resource name from
`gcloud iam workload-identity-pools providers describe`.

## What CI is allowed to do

- Push images to Artifact Registry (`roles/artifactregistry.writer`)
- Update Cloud Run service/job **image** only (`roles/run.developer` +
  `roles/iam.serviceAccountUser` on runtime SAs)
- **Not** `terraform apply`, Secret Manager secret values, or GCS publish

See also [image-digests.md](image-digests.md).
