# Live telemetry: hand-off to the CI/CD owner

Live telemetry of the baseline chat (ADR 0012 / 0015) was first enabled **by
hand** on the staging service so it could be tried before touching Terraform.
This note records what exists outside Terraform, every Terraform change this
work made or proposes, and the steps to bring the two back in line. No secret
values appear here.

The CI/CD owner is editing the same Terraform files, so the change that touches
shared files (`main.tf`, `variables.tf`) is **not applied in the repository**.
It is kept as a patch plus the snippets below, so it can be reapplied or ported
without being overwritten or causing a conflict.

## Why this matters

Terraform owns the Cloud Run environment: `ignore_changes` covers only the
image (see `modules/runtime/main.tf`). Anything added to the service by hand,
plain or secret, is removed by the next `terraform apply`. `SERVICE_TOKEN` is
required in staging (`SVC-CORE-9002`), so an apply that drops it leaves the
service unable to start. CI never applies (`publish-images` updates the image
only), so the risk is only an apply by a person.

## What exists outside Terraform today

| Item | Kind | Notes |
| --- | --- | --- |
| `SERVICE_TOKEN`, `PRIVATE_DATA_ENCRYPTION_KEY`, `DEMO_ACTOR_HMAC_KEY` | Secret refs | Secrets `bankai-<NAME>`, attached by hand before this work |
| `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY` | Secret refs | Secrets `bankai-<NAME>`, attached by hand |
| `TELEMETRY_CORRELATOR_KEY` | Secret ref | Secret `bankai-TELEMETRY_CORRELATOR_KEY` |
| `OTEL_ENABLED`, `LANGFUSE_ENABLED` | Plain env | Must be enabled together (`SVC-CORE-9017`) |
| `BIGQUERY_EVAL_DATASET`, `BIGQUERY_EVAL_TABLE` | Plain env | Dataset `bankai_evaluation`, table `evaluation_results` |
| Dataset `bankai_evaluation`, table `evaluation_results` | BigQuery | Created with `bq mk` from `modules/runtime/evaluation_results_schema.json` |
| Table `evaluation_results_local` | BigQuery | Local trials only. **Not** in Terraform and should stay out |
| Backend account access to the secrets above | IAM | `secretAccessor`, granted by hand |
| Backend account write access to `evaluation_results` | IAM | `bigquery.dataEditor` on the table, by hand: broader than needed |

The service also runs flags that `terraform.tfvars.example` and
[`staging-flag-matrix.md`](staging-flag-matrix.md) do not list (for example
`CHAT_PIPELINE=baseline`, `BASELINE_CHAT_ENABLED=true`, `VERTEX_AI_*`,
`BIGQUERY_ENABLED`). Either the real tfvars carry them or they were also set by
hand; the plan below will show which.

## Terraform changes made by this work

### 1. Already on the branch (additive only, nothing deleted)

| File | Change |
| --- | --- |
| `modules/runtime/evaluation_results.tf` (new) | Dataset `evaluation_dataset_id`, partitioned and clustered table `evaluation_results`, insert-only custom role (`bigquery.tables.updateData`) and its binding on that table for the backend account |
| `modules/runtime/evaluation_results_schema.json` (new) | Table schema `v1`. A backend test (`tests/bigquery-evaluation-result-sink.test.ts`) reads it to detect drift from `src/domain/observability/evaluation-result-record.ts`: do not move or delete it without updating that test |
| `modules/runtime/variables.tf` | `evaluation_dataset_id`, `evaluation_table_id` |
| `modules/runtime/outputs.tf` | `evaluation_dataset`, `evaluation_table` |
| `modules/runtime/README.md`, `environments/dev/terraform.tfvars.example` | Documentation and an inert, commented example |

An apply would create these. The dataset and table already exist (created by
hand), so they must be imported first (step 4 below).

### 2. Proposed, not applied: `live-telemetry-terraform.patch`

Secret Manager support for the backend environment. Six files, written against
the tree as of this commit:

```text
git apply deploy/docs/live-telemetry-terraform.patch
git apply --3way deploy/docs/live-telemetry-terraform.patch   # if the files moved
```

A dry run (`git apply --check`) passed on a Windows (CRLF) working tree, with and
without `--ignore-whitespace`. If the files have drifted, port the five pieces by
hand; the intent is:

1. **`modules/runtime/variables.tf`**, a map of references and no values:

   ```hcl
   variable "backend_secret_environment" {
     type = map(object({
       secret  = string
       version = optional(string, "latest")
     }))
     default     = {}
     description = "Secret Manager references injected into the backend as environment variables: env name => { secret id, version }."
   }
   ```

2. **`modules/runtime/main.tf`**, a second `env` block next to the plain one in
   the backend `containers` block:

   ```hcl
   dynamic "env" {
     for_each = var.backend_secret_environment
     content {
       name = env.key
       value_source {
         secret_key_ref {
           secret  = env.value.secret
           version = env.value.version
         }
       }
     }
   }
   ```

3. **`modules/runtime/main.tf`**, a guard in the service `lifecycle` block so a
   name cannot be both plain and secret:

   ```hcl
   precondition {
     condition     = length(setintersection(keys(local.backend_env), keys(var.backend_secret_environment))) == 0
     error_message = "An environment variable cannot be both plain (backend_environment) and a Secret Manager reference (backend_secret_environment)."
   }
   ```

4. **`modules/runtime/main.tf`**, read access for the backend account on each
   referenced secret (additive, so an existing manual grant is harmless):

   ```hcl
   resource "google_secret_manager_secret_iam_member" "backend_secret_accessor" {
     for_each = toset([for ref in values(var.backend_secret_environment) : ref.secret])

     project   = var.project_id
     secret_id = each.value
     role      = "roles/secretmanager.secretAccessor"
     member    = "serviceAccount:${google_service_account.backend.email}"
   }
   ```

5. **`environments/dev`**, the same variable in `variables.tf` and
   `backend_secret_environment = var.backend_secret_environment` in the
   `runtime` module call in `main.tf`. `terraform fmt` realigns every `=` in
   that block, which is most of the patch's deletions.

With the default `{}` the patch changes nothing in the plan: no `env` block is
generated and no IAM resource is created. `fmt -check`, `init -backend=false` and
`validate` passed (Terraform 1.16.5) before it was extracted; CI uses 1.8.5 and
everything used exists since 1.3. No `plan` has been run.

## Reconcile (needs credentials and explicit authorization)

1. **Plan first, read-only.** `terraform -chdir=terraform/environments/dev plan`
   with the real tfvars. Every variable or secret the plan wants to **remove** is
   something still missing from tfvars. Do not apply until that list is empty.
2. **Apply the patch (section 2)**, then declare the secrets in the real tfvars
   (outside Git):

   ```hcl
   backend_secret_environment = {
     SERVICE_TOKEN               = { secret = "bankai-SERVICE_TOKEN" }
     PRIVATE_DATA_ENCRYPTION_KEY = { secret = "bankai-PRIVATE_DATA_ENCRYPTION_KEY" }
     DEMO_ACTOR_HMAC_KEY         = { secret = "bankai-DEMO_ACTOR_HMAC_KEY" }
     LANGFUSE_PUBLIC_KEY         = { secret = "bankai-LANGFUSE_PUBLIC_KEY" }
     LANGFUSE_SECRET_KEY         = { secret = "bankai-LANGFUSE_SECRET_KEY" }
     TELEMETRY_CORRELATOR_KEY    = { secret = "bankai-TELEMETRY_CORRELATOR_KEY" }
   }
   ```

   If a secret is pinned to a numeric version today, set `version` to match;
   otherwise `latest` changes what the service reads.
3. **Declare the plain env** in `backend_environment`: `OTEL_ENABLED`,
   `LANGFUSE_ENABLED`, `BIGQUERY_EVAL_DATASET`, `BIGQUERY_EVAL_TABLE`, and any
   flag the plan showed as missing.
4. **Import what was created by hand**, or the apply fails with "already exists":

   ```text
   terraform import module.runtime.google_bigquery_dataset.evaluation projects/factored-hackathon/datasets/bankai_evaluation
   terraform import module.runtime.google_bigquery_table.evaluation_results projects/factored-hackathon/datasets/bankai_evaluation/tables/evaluation_results
   ```

   Run `plan` again. Expect only in-place updates (descriptions, protection).
   If it proposes to **replace** either one, stop and review.
5. **Apply**, then remove the manual broader grant:
   `bigquery.dataEditor` on `evaluation_results` for the backend account.

## Check after the apply

- The service still starts and serves traffic; `SERVICE_TOKEN` is present.
- The log shows `live_telemetry_enabled` with `spans` and `rows` true, and no
  `live_telemetry_delivery_failed`. A `sink_permission_denied` means the insert
  role or table binding is missing.
- Langfuse (US) shows `evaluation` traces with environment `staging`, and the
  correlator matches the `correlator` column of `evaluation_results`.
- Enable `OTEL_ENABLED` and `LANGFUSE_ENABLED` only once the image that reads
  them is deployed, and together.
