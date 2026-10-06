# Handoff — Ingesta ADR 0020 + Terraform / correlador (P0-33, 36, 37, 41–43, 49)

Propósito: backlog operativo de infra/datos restante. **No** ejecuta
`terraform apply`, jobs cloud ni transferencias S3.

## Estado 2026-10-05

| ID | Hoja | Lectura reconciliada |
| --- | --- | --- |
| P0-33 | IN PROGRESS | Código OTel/Langfuse/BQ eval listo; flags off; correlador plano en Run |
| P0-36 | IN PROGRESS | TF declara IAM/secretos/VPC; falta import/create + plan/apply autorizado |
| P0-37 | IN PROGRESS | Cloud Run Ready + Job creado; Job sin ejecuciones; TF no reconciliado |
| P0-41 | PENDING | STS S3→GCS no desplegado |
| P0-42 | PENDING | Load GCS→`raw` administrado abierto |
| P0-43 | PENDING (hoja) | **Nota:** `stg`/`aux`/`cur` ya materializados por Fase 2 canónica desde `hackathon`; lo abierto es el camino administrado raw→cur (ADR 0020), no rehacer prepare canónico |
| P0-49 | IN PROGRESS | Idempotencia local; falta Eventarc→Tasks→worker→BQ |

Datos vivos: `prepare-20261005-canonical`, `graph-20261005-cur`. `raw` sólo
`branches` + `complaints`.

## Checklist correlador + TF (antes de apply)

Seguir [`../../deploy/docs/live-telemetry-handoff.md`](../../deploy/docs/live-telemetry-handoff.md):

- [ ] Crear/rotar `TELEMETRY_CORRELATOR_KEY` en Secret Manager (nunca env plano).
- [ ] Declarar `backend_secret_environment` completo en tfvars fuera de Git.
- [ ] Importar dataset/tabla `bankai_evaluation` si ya existen.
- [ ] `terraform plan` sin destrucciones no intencionales de env/secretos.
- [ ] Apply **sólo** con tarea/autorización explícita.

## Checklist ADR 0020 (sin tocar `cur`/KG)

- [ ] STS agentless no destructivo → `gs://…/raw/`.
- [ ] Eventarc `object.finalized` → Cloud Tasks OIDC.
- [ ] Worker: validated → `verified/` → BigQuery `ingestion_ledger` + load `raw_*`.
- [ ] Idempotencia `source_system + hash + generation`.
- [ ] Lease Firestore para serializar refresh/KDD/publish (ya usado en publish KG).
- [ ] Ejecución observada del Job `bankai-pipeline` (cierra remanente P0-37).

## Qué no hacer

- Borrar o recrear `cur` / `graph-20261005-cur` al cablear raw.
- Sustituir STS/Eventarc por scripts one-off desde el backend.
- Marcar P0-37 COMPLETED solo porque el servicio Run está Ready.
