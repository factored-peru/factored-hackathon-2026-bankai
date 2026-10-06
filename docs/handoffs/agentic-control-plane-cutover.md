# Handoff — Cutover agentic / control_plane (P0-23–26, P0-29, P0-34)

Propósito: checklist de cutover **cuando haya autorización**. No aplica flags
en Cloud Run ni crea plantillas Model Armor por sí mismo.

## Estado 2026-10-05

| ID | Hoja | Repo | Staging |
| --- | --- | --- | --- |
| P0-23 | IN PROGRESS | StateGraph + runner + HITL bridge + casuísticas | `CHAT_PIPELINE=baseline` |
| P0-24/25/26/29 | IN PROGRESS | Rails/JEV/policy/output en código y tests | Sin agentic |
| P0-34 | PENDING | — | Model Armor API on; templates no listados |

Matriz vigente: [`../deploy/docs/staging-flag-matrix.md`](../../deploy/docs/staging-flag-matrix.md).

## Precondiciones (todas)

1. Plantillas Model Armor input/output creadas y referenciadas (P0-34).
2. `TELEMETRY_CORRELATOR_KEY` (y Langfuse si aplica) en Secret Manager — ver
   [`../deploy/docs/live-telemetry-handoff.md`](../../deploy/docs/live-telemetry-handoff.md).
3. `terraform plan` revisado; apply autorizado si cambia env/secrets.
4. Auth: o bien se mantiene demo **sin** `AGENTIC_CHAT_ENABLED`, o Firebase Auth
   listo — agentic fuerza `DEMO_AUTH_ENABLED=false`.
5. Suite local verde: `hitl-routing`, `casuistics-control-plane`, policy/gateway.

## Cutover propuesto (staging)

Orden conservador:

1. Verificar Model Armor + SDP en dry-run/smoke autorizado.
2. Desplegar imagen que incluye control plane (ya en `main` post PR #13).
3. Set autorizado (tfvars / Secret Manager), **no** `gcloud run services update`
   ad-hoc que pise Terraform:
   - Opción A (HITL sin agentic completo): `CHAT_PIPELINE=control_plane` con
     providers seguros ya cableados en server; confirmar `SVC-CORE-9022`.
   - Opción B (agentic productivo): `AGENTIC_CHAT_ENABLED=true` +
     `DEMO_AUTH_ENABLED=false` + BigQuery + JEV + Vertex + Model Armor.
4. Smoke: consulta segura → completed; repregunta → `awaiting_clarification`;
   escalamiento → `pending_approval` + eventos HITL.
5. Sólo entonces actualizar hoja P0-23 (y 24–26/29/34 según DoD) a `COMPLETED`.

## Anti-patrones

- Marcar P0-23 COMPLETED solo porque el código está en `main`.
- Activar agentic con correlador plano o templates Model Armor desconocidos.
- Mezclar baseline y agentic en el mismo revision sin matriz documentada.
