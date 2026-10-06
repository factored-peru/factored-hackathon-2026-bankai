# Estado P0 reconciliado — 2026-10-05 (post PR #13)

Documento operativo de reconciliación. No sustituye ADR ni convierte
`planning/to-adopt/` en norma. Complementa y corrige el subconjunto
desactualizado de [`task-status-gcp-20261005.md`](task-status-gcp-20261005.md)
tras el merge de control plane / HITL / casuísticas.

## Snapshot

| Campo | Valor |
| --- | --- |
| Git HEAD | `52c564b` (merge PR #13 `feat/p0-ab-control-plane-casuistics`) |
| Hoja | `planning/to-adopt/factored_tasks.xlsx` → **28 COMPLETED / 11 IN PROGRESS / 11 PENDING** (56%) |
| Staging chat | Sigue `CHAT_PIPELINE=baseline`, `AGENTIC_CHAT_ENABLED=false` |
| Control plane en repo | Cableado (`CHAT_PIPELINE=control_plane`), heurística HITL, casuísticas + ADR 0004/0007 |
| P0-23 DoD live | **No cerrado** — código avanzado; staging no en control_plane |

## Corrección vs snapshot GCP de la tarde

El inventario GCP (`task-status-gcp-20261005.md`, ~18:02) listaba P0-23 como
“conectar StateGraph al runner productivo” sin progreso. Tras PR #12/#13 eso
queda **incorrecto para el repositorio**:

| Capa | Estado real |
| --- | --- |
| Código | `create-control-plane-conversation-runtime`, `ControlPlaneConversationRunner`, puente `requiresEscalation` → `escalation.request`, `HeuristicHitlDecisionSignalProvider`, tests `hitl-routing` / `casuistics-control-plane` |
| ADR | 0004 / 0007 con taxonomía `answerable` / `escalate_hitl` / `ood_refuse` |
| Eval | P0-50 A/B local baseline vs control plane (`eval:compare`; Vertex opcional); P0-48 gate 48+5. Ver `app/backend/docs/eval-ab-local.md`. |
| Staging | Sin cutover: baseline + demo auth; Model Armor templates no verificados |

**Regla:** no marcar P0-23 `COMPLETED` hasta DoD en entorno objetivo (agentic /
control_plane + evidencia de rutas en staging o E2E autorizado).

## Completitud por fase

| Fase | % | Lectura |
| --- | --- | --- |
| 0–2, 4 | 100% | Cerradas en hoja + evidencia GCP/BQ/GCS |
| 3 (ingesta ADR 0020) | ~0–20% | Run/Job parcial; STS/Eventarc/Tasks abiertos |
| 5 (backend productivo) | ~44% | Stores/demo/baseline sí; Auth Firebase / agentic / Model Armor no |
| 6 (eval/QA) | ~67–75% | CI + A/B sí; P0-39 E2E integrado no |

## Abierto agrupado (22 filas)

Ver handoffs:

- Frontend/Auth: [`handoffs/frontend-auth-smoke-p0-16-22-38.md`](handoffs/frontend-auth-smoke-p0-16-22-38.md)
- Agentic / control_plane cutover: [`handoffs/agentic-control-plane-cutover.md`](handoffs/agentic-control-plane-cutover.md)
- Ingesta + TF + correlador: [`handoffs/adr0020-ingest-and-tf.md`](handoffs/adr0020-ingest-and-tf.md)
- E2E P0-39: [`handoffs/p0-39-e2e-checklist.md`](handoffs/p0-39-e2e-checklist.md)

## Secuencia segura (sin apply implícito)

1. Correlador → Secret Manager + `terraform plan` revisado.
2. ADR 0020 raw sin borrar `cur` / KG publicados.
3. Seed Firestore `--execute` si falta overlay; Auth Firebase; cutover
   `control_plane` / agentic con Model Armor verificado.
4. E2E P0-39 en entorno integrado.
5. Actualizar hoja (`Respuesta`; `COMPLETED` sólo con DoD) y este documento.

Acciones que escriben GCP requieren autorización explícita y credenciales fuera
de Git.
