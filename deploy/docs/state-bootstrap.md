# State bootstrap: local vs cloud

Aligned with ADR 0017: Valkey is ephemeral; Firestore/GCS/BigQuery hold durable
or analytical state. `deploy/` provisions cloud infra; it does not own product
DDL or seed data scripts (those live in owner layers).

## Matrix

| Store | Local | Cloud |
| --- | --- | --- |
| Valkey / sessions | [local/backend-compose.yml](../local/backend-compose.yml) (`valkey:8.1.10-alpine`) | Memorystore + **Serverless VPC Access** connector (`modules/state` → Cloud Run `vpc_access`) |
| Firestore | Flags off → in-memory demo stores; no emulator required for MVP | Native DB + `conversation_snapshots` index (`modules/state`); `FIRESTORE_ENABLED` injected when uploads bucket wired |
| GCS uploads | N/A | Private uploads bucket (`modules/state`) → `GCS_UPLOAD_BUCKET` / `GCS_ENABLED` on Cloud Run |
| GCS KG artifacts | `KG_RAG_LOCAL_*` + `.local/kg-rag` | Private KG bucket (`modules/runtime`) → `GCS_GRAPH_BUCKET` |
| BigQuery | Not emulated in Compose | Dataset/jobs: pipeline script `scripts/bootstrap_csv_to_bigquery.py` (dry-run default); not yet a TF `data` module |

Flags on the serverless Cloud Run service come from Terraform merge of `state`
outputs — see [staging-flag-matrix.md](staging-flag-matrix.md). CI must not
overwrite them when rotating images.

## Local quick path

```bash
# From repo root — Valkey + backend image via Compose
export SERVICE_TOKEN="$(openssl rand -base64 32)"
docker compose -f deploy/local/backend-compose.yml up --build -d
```

Session store stays off until `PRIVATE_DATA_ENCRYPTION_KEY` is supplied.
LLM cache (`LLM_CACHE_*`) reuses the same Valkey URL when enabled; never stores
raw prompts or evidence.

## Cloud quick path

1. Authorized `terraform apply` in `terraform/environments/dev` (modules
   `registry`, `state`, `runtime`).
2. Push digest-pinned images ([image-digests.md](image-digests.md)).
3. Inject secrets via Secret Manager / CI (`SERVICE_TOKEN`,
   `PRIVATE_DATA_ENCRYPTION_KEY`) — never Git.
4. Optional BigQuery seed: from `data-ingestion-and-processing/`, run bootstrap
   with explicit project/dataset (prefer `--dry-run` first).
5. Flags: [staging-flag-matrix.md](staging-flag-matrix.md).

## Anti-patterns

- Building images inside `deploy/` for cloud deploy (use layer `publish-image.sh`)
- Putting checkpoints, cases, or BigQuery rows in Valkey
- `terraform apply` from CI on every app commit (CI updates image digests only)
- Clearing or re-setting Cloud Run env in CI (`--clear-env-vars` / blanket
  `--set-env-vars`) and wiping `GCS_UPLOAD_*` / `FIRESTORE_*` / `KV_*`
