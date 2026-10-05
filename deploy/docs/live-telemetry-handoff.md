# Live telemetry: Terraform reconciliation

Live baseline telemetry is optional under ADR 0012 and ADR 0015. Terraform now
owns its Cloud Run configuration: `backend_secret_environment` contains only
Secret Manager references, never values, while `backend_environment` carries
the non-secret flags.

## Before an authorized apply

1. Run `terraform plan` with real tfvars and stop if it proposes removing a
   service environment variable or secret reference that is intentionally in
   use. Anything configured manually must first be represented in tfvars.
2. If an evaluation dataset or table already exists, import it before apply:

   ```text
   terraform import module.runtime.google_bigquery_dataset.evaluation projects/PROJECT/datasets/bankai_evaluation
   terraform import module.runtime.google_bigquery_table.evaluation_results projects/PROJECT/datasets/bankai_evaluation/tables/evaluation_results
   ```

3. Declare required Secret Manager references outside Git. Pin `version` when
   a rotation must not take effect automatically; otherwise it defaults to
   `latest`.

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

4. For live telemetry, set `OTEL_ENABLED=true` and `LANGFUSE_ENABLED=true`
   together, plus a distinct `BIGQUERY_EVAL_DATASET` and its table. Baseline
   telemetry is emitted only with `CHAT_PIPELINE=baseline`.

## After an authorized apply

- Confirm the backend starts with all required secret references.
- Confirm the backend account has only the insert role for
  `evaluation_results`; remove broader manual table roles after migration.
- Confirm logs report `live_telemetry_enabled` without delivery failures and
  that Langfuse receives metadata-only `evaluation` spans.

No apply, import, secret creation, BigQuery write, or Langfuse traffic is
performed by this repository check.
