# Handoff — QA E2E P0-39

Propósito: separar **evidencia local ya disponible** del DoD E2E integrado
(Playwright/k6/staging) que sigue abierto.

## DoD (hoja)

Evidencia E2E: normal, clarification, HITL, OOD, catálogo ausente, proveedor
caído, cross-tenant, injection, presupuesto, ES/PT; p50/p95; resiliencia.

## Evidencia local 2026-10-05 (no cierra P0-39)

Suite Bun relevante (control plane / HITL / policy / aislamiento):

| Área | Tests |
| --- | --- |
| HITL bridge H14/H2/OOD | `tests/hitl-routing.test.ts` |
| Casuísticas segura / repregunta / escalamiento + WS events | `tests/casuistics-control-plane.test.ts` |
| Policy ALLOW/DENY/REQUIRE_APPROVAL | `tests/dispute-policy.test.ts`, `agent-matrix.test.ts` |
| Contratos OpenAPI | `tests/contract/openapi-contract.test.ts` |
| Session / profiles | `tests/session*.test.ts`, `user-profile-store.test.ts` |
| Eval CI 48+5 | `bun run eval:gate` (P0-48; no sustituye E2E) |

Comando de evidencia local (desde `app/backend/`):

```bash
bun test tests/hitl-routing.test.ts tests/casuistics-control-plane.test.ts tests/dispute-policy.test.ts
bun run eval:gate
```

Resultado de esta reconciliación: ver sección “Evidencia corrida” abajo (se
rellena al ejecutar).

## Checklist entorno integrado (cierra P0-39)

Precondiciones: smoke frontend Auth **o** demo auth estable; preferible
`CHAT_PIPELINE=control_plane` en staging; correlador/Model Armor según cutover.

- [ ] Normal answerable (ledger/consulta segura) → `assistant.completed`
- [ ] Clarification → `awaiting_clarification` + evento cliente
- [ ] HITL → `pending_approval` + `hitl.created` / `backoffice.alert`
- [ ] OOD → completed seguro (no HITL)
- [ ] Catálogo ausente / deny cerrado
- [ ] Proveedor caído → safe fallback
- [ ] Cross-tenant reject
- [ ] Injection / Model Armor path
- [ ] Presupuesto / resource budget
- [ ] ES/PT smoke
- [ ] p50/p95 publicados (k6 u observabilidad autorizada)
- [ ] Playwright (o equivalente) versionado; sin PII real en artefactos

## Evidencia corrida

| Fecha | Comando | Resultado |
| --- | --- | --- |
| 2026-10-05 | `bun test tests/hitl-routing.test.ts tests/casuistics-control-plane.test.ts tests/dispute-policy.test.ts` | **17 pass / 0 fail** (68 expects) |
| 2026-10-05 | `bun run eval:gate` | **ok** — 48 core + 5 KG C1–C5 (53 fixtures; gate informational) |

Esta evidencia **no** marca P0-39 `COMPLETED` en hoja.
