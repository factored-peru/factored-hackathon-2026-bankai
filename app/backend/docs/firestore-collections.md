# Firestore collections (durable app state)

Normative layout for sessions/users/interactivity. Sessions themselves live in
Valkey (ADR 0005 / 0017), not Firestore.

## Collections

### `conversation_snapshots`

| Field | Notes |
| --- | --- |
| Doc id | `threadId` |
| `tenantId`, `ownerUserId`, `revision` | Optimistic concurrency on `save` |
| `messages[]` | Sanitized only — no raw prompts/PII |
| `trace.{traceId,status,reasonCode,decisionId,workflowId,approvalId,updatedAt}` | Run metadata |

**Composite index (list):** `tenantId` ASC, `ownerUserId` ASC, `trace.updatedAt` DESC.
Declared in repo-root [`firestore.indexes.json`](../../../firestore.indexes.json)
(and mirrored in Terraform `modules/state`). Deploy indexes without TF apply via
Firebase CLI or `gcloud firestore indexes composite create` — see
[`deploy/docs/state-bootstrap.md`](../../../deploy/docs/state-bootstrap.md).

### `conversation_attachments`

| Field | Notes |
| --- | --- |
| Doc id | `attachmentId` |
| Safe | `attachmentId`, `kind`, `mediaType`, `status` |
| Private | `ownerUserId`, `tenantId`, `objectName`, `byteSize` |

Binary bytes live in GCS (`GCS_UPLOAD_BUCKET` / prefix). Never over WebSocket.

### `customer_identity_bindings`

| Field | Notes |
| --- | --- |
| Doc id | `sha256(tenantId + '\\0' + userId)` |
| `tenantId`, `userId`, `customerId` | Server-side banking link |
| `status` | Must be `"active"` |
| `version` | Binding version string |

### `user_profiles`

| Field | Notes |
| --- | --- |
| Doc id | Same hash as bindings |
| `roles[]`, `capabilities[]` | Prefer over demo actor directory when `status=active` |
| `status` | `active` \| `revoked` |
| `displayLabel` | Optional |
| `updatedAt` | ISO timestamp |

### Demo identity seed

Seed script (owner layer: `app/backend/`):

```bash
bun run seed:firestore-demo-identity          # --dry-run (default)
bun run seed:firestore-demo-identity -- --execute --fixture
bun run seed:firestore-demo-identity -- --execute --from-bigquery
```

- Writes allowlisted roles/capabilities into `user_profiles` and optional
  `customer_identity_bindings` for demo actors (`demo-bankai` tenant).
- `--dry-run` is the CI default; never logs customer IDs / PII.
- `--execute` requires ADC + explicit authorization (local or
  `workflow_dispatch` “Seed Firestore demo identity”).
- Fixture mode uses synthetic customer ids; BigQuery mode uses the same HMAC
  cohort as `BigQueryDemoActorDirectory` without printing source values.

### `pipeline_leases` (offline pipeline)

Owned by `data-ingestion-and-processing`; not read by the chat path.

## Runtime flags

| Mode | Flags |
| --- | --- |
| Demo in-memory (default) | `DEMO_AUTH_ENABLED=true`, Firestore/GCS/Valkey off |
| Productive local/GCP | `FIRESTORE_ENABLED` + `GCS_ENABLED` + `GCS_UPLOAD_BUCKET` (conversaciones, adjuntos, `user_profiles`, bindings) y/o `SESSION_STORE_ENABLED` + `KV_URL` + `PRIVATE_DATA_ENCRYPTION_KEY` (sesiones Valkey) |

Staging Cloud Run matrix (Terraform injects most productive flags):
[`deploy/docs/staging-flag-matrix.md`](../../../deploy/docs/staging-flag-matrix.md).

Process-local LRU wraps SessionStore.get, conversation get, identity resolve, and BigQuery demo cohort — never inside the LangGraph control plane.
