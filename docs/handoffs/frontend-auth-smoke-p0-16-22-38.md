# Handoff — Frontend / Auth smoke (P0-16–20, P0-22, P0-38)

Propósito: **desbloquear** el cierre de Auth backend (P0-22) y despliegue
frontend (P0-38) entregando el contrato que Harumi debe satisfacer. No sustituye
ADR 0021 ni crea el scaffold Next.js (propiedad de `app/frontend/`).

## Estado 2026-10-05

| ID | Estado hoja | Bloqueo |
| --- | --- | --- |
| P0-16–20 | PENDING (Harumi) | Sin `package.json` / App Hosting en `app/frontend/` |
| P0-22 | IN PROGRESS (Ricardo) | RBAC seed listo; Firebase ID token E2E espera P0-17 |
| P0-38 | PENDING (Ricardo) | Bloqueado por P0-16/P0-17 + App Hosting |

Staging: `DEMO_AUTH_ENABLED=true`; Firebase proyecto asociado; sin App Hosting.

## Contrato mínimo (backend ya publicado)

Specs: `app/backend/specs/openapi.json`, `asyncapi.json`.

1. Origen HTTPS del frontend allowlisted en `CORS_ALLOWED_ORIGINS`.
2. Solo vars públicas (`NEXT_PUBLIC_*` sin secretos): API/WSS URL, config Firebase pública.
3. Auth productivo: Firebase ID token → cookie opaca / `SessionManager` → actor
   tenant/rol/capability (demo path actual: `GET /v1/demo/actors` →
   `POST /v1/demo/sessions` → `GET /v1/me` → WS `/v1/realtime`).
4. Ante cierre WS: reconectar + `GET /v1/conversations/{threadId}`.
5. Uploads vía `POST /v1/uploads`, nunca por WebSocket.
6. Backoffice: approve/reject HITL sólo vía API autorizada; UI no decide policy.

## Smoke externo (cierra interfaz Ricardo ↔ Harumi)

Marcar listo cuando pasen en staging/local integrado:

- [ ] Health API 200 desde origen frontend.
- [ ] Login demo **o** Firebase demo cliente/operador.
- [ ] Apertura de chat/WS autenticado; snapshot + evento incremental.
- [ ] Rechazo cross-origin y fallo cerrado sin token.
- [ ] Superficie operador ve `hitl.created` / `backoffice.alert` cuando el
      control plane emite escalamiento (tras cutover o fixture).

Hasta ese smoke, P0-22/P0-38 **no** se cierran por “demo local sin App Hosting”.

## Qué no hacer desde otras capas

- No inventar scaffold en `app/frontend/` desde backend/deploy sin dueño Harumi.
- No `firebase deploy` ad-hoc ni Vercel (ADR 0021: solo App Hosting).
- No habilitar `AGENTIC_CHAT_ENABLED` sólo para “probar UI”.
