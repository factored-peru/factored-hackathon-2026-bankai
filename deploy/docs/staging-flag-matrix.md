# Staging / Cloud Run productive flag matrix

Companion to [`firestore-collections.md`](../../app/backend/docs/firestore-collections.md)
and ADR 0017. Use with `APP_ENV=staging` while the frontend still depends on
`DEMO_AUTH_ENABLED`.

## Injected by Terraform (do not duplicate in tfvars)

| Flag / wiring | Source |
| --- | --- |
| `GCS_GRAPH_BUCKET` | `runtime` KG bucket |
| `GCS_UPLOAD_BUCKET` | `state` uploads bucket |
| `GCS_UPLOAD_PREFIX` | fixed `conversation-uploads/` |
| `FIRESTORE_ENABLED` | `true` when upload bucket wired |
| `GCS_ENABLED` | `true` when upload bucket wired |
| `SESSION_STORE_ENABLED` | `true` when Memorystore wired |
| `KV_URL` / `KV_PROVIDER` / `KV_TLS` | Memorystore host (`redis://`, TLS off in VPC) |
| Serverless VPC Access connector | `state` → `vpc_connector_id` on Cloud Run (`PRIVATE_RANGES_ONLY`); required for Memorystore reachability |

**Ownership:** Terraform owns env vars, VPC connector, IAM, and buckets. CI owns
only the container **image digest** (see [image-digests.md](image-digests.md)).
Do not set `GCS_UPLOAD_*`, `FIRESTORE_*`, or `KV_*` in `backend_environment`
tfvars — they are merged from `state`.

## Set in `backend_environment` (tfvars / CI)

| Flag | Staging value |
| --- | --- |
| `APP_ENV` | `staging` |
| `DEMO_AUTH_ENABLED` | `true` |
| `REALTIME_ENABLED` | `true` (needs `CORS_ALLOWED_ORIGINS`) |
| `CHAT_ENABLED` | `true` |
| `CHAT_PIPELINE` | `baseline` |
| `AGENTIC_CHAT_ENABLED` | `false` |
| `BASELINE_CHAT_ENABLED` | `true` |
| `VERTEX_AI_ENABLED` | `true` (`VERTEX_AI_PROJECT_ID` / `LOCATION` / `MODEL`) |
| `BIGQUERY_ENABLED` | `true` (`GOOGLE_CLOUD_*`, `BIGQUERY_DATASET`, catalog paths) |
| `KG_RAG_LOCAL_ENABLED` | `false` |
| `GCS_GRAPH_TENANT_ID` | `demo-bankai` |
| `LLM_CACHE_ENABLED` | `false` until baseline/agentic needs exact-match (requires `KV_URL`) |
| `LLM_CACHE_TTL_SECONDS` | `600` when enabling LLM cache |

## Secrets (Secret Manager / CI only — never Git)

| Secret | Required when |
| --- | --- |
| `SERVICE_TOKEN` | `APP_ENV` is staging or prod |
| `PRIVATE_DATA_ENCRYPTION_KEY` | `SESSION_STORE_ENABLED=true` (32-byte key, base64url) |
| `DEMO_ACTOR_HMAC_KEY` | `BIGQUERY_ENABLED=true` with demo actors |

## LLM cache notes

Same Memorystore as sessions (`llm:resp:v1:` namespace). Do not enable without
`KV_URL`. Does not create a second cluster. Checkpoints stay in Firestore.
Off by default in this matrix.

## Images / CI

- Digests only in Cloud Run: see [image-digests.md](image-digests.md).
- GitHub Actions publishes to Artifact Registry and may update service/job
  **image only**; it must never `--clear-env-vars` / `--set-env-vars` that
  overwrite Terraform-injected `GCS_UPLOAD_*`, `FIRESTORE_*`, or `KV_*`.
  It does **not** `terraform apply`. WIF: [github-wif.md](github-wif.md).
- Local vs cloud stores: [state-bootstrap.md](state-bootstrap.md).

## Keep off until agentic cutover

`AGENTIC_CHAT_ENABLED` forces `DEMO_AUTH_ENABLED=false` plus BigQuery, JEV,
Vertex, Model Armor. Do not enable in this staging matrix.
