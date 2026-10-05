# Plan operativo P0 por fases — Ricardo / All

Documento operativo no normativo. Ordena la entrega P0 asignada a Ricardo o
All, traza cada fase a `planning/to-adopt/factored_tasks.xlsx` y respeta los
ADR vigentes. No sustituye la hoja de tareas ni reescribe
`planning/to-adopt/` como arquitectura.

## 1. Propósito, límites y fuente de verdad

### Propósito

Definir el orden de cierre P0 para Dispute Transaction Support: qué se entrega
en cada fase, qué precondiciones se exigen, cómo se valida y cuándo una tarea
puede pasar de `PENDING` / `IN PROGRESS` a `COMPLETED` en la hoja.

### Límites

- Cubre sólo tareas P0 con asignado **Ricardo** o **All**.
- Las tareas de frontend/Firebase de Harumi (y el despliegue frontend que
  depende de ellas) se registran como **dependencias externas**, no como
  trabajo asignado en las fases.
- Código y pruebas locales **no** cierran una tarea cuyo DoD exige BigQuery,
  GCS, Firestore, Valkey, Cloud Run, Firebase o validación en el entorno
  objetivo.
- `terraform apply`, despliegues, jobs cloud y etapas del pipeline sin
  `--dry-run` requieren autorización explícita y credenciales fuera de Git.
- Este plan no altera ADR ni convierte material de `planning/to-adopt/` en
  norma.

### Fuente de verdad

| Rol | Artefacto |
| --- | --- |
| Trazabilidad de tareas, asignados, DoD y estado | `planning/to-adopt/factored_tasks.xlsx` |
| Autoridad arquitectónica | `adr/` (especialmente 0004, 0009–0012, 0015–0017, 0020–0022) |
| Estado reconciliado de implementación local | [`task-implementation-audit-20261004.md`](task-implementation-audit-20261004.md) |
| Orden operativo de cierre | este documento |

## 2. Estado de partida

Resumen alineado con la auditoría del 2026-10-04 y la hoja:

| Ámbito | Hallazgo |
| --- | --- |
| Backend | Código, contratos, demo, guardrails, control plane, SessionManager y dobles existen; `bun test` local aprueba. Cloud Run staging corre **chat baseline** (`CHAT_PIPELINE=baseline`, Vertex `gemini-2.5-flash`, BigQuery, demo auth, realtime). DoD de Fase 5 sigue abierto: Firebase Auth/RBAC productivo, agentic, Model Armor y pruebas de integración autorizadas. |
| Pipeline | **Fase 2** `stg`/`aux`/`cur` y **Fase 4** KDD/C1–C5/`graph-20261005-cur` publicados con lease. Sigue abierto ADR 0020 raw (Fase 3). |
| Producto / baseline | Fase 0 cerrada. Fase 1 ejecutada sobre `factored-hackathon.hackathon`: motivos, volumen/severidad y baseline p50/p90 de resolución documentados. |
| Evaluación | P0-40 `COMPLETED`. Matriz 48 core + 5 extensiones KG C1–C5 presente (P0-48 en progreso). CI E2E y baseline humana pendientes. |
| Infra | Cloud Run + Job + Redis/VPC + AR vivos (ver `task-status-gcp-20261005.md`). Correlador de telemetría aún plano → no `terraform apply`. Ingesta S3→GCS administrada no desplegada; `raw` sigue incompleto (no bloquea capa curada canónica). |
| Frontend | Sin scaffold Next.js/App Hosting en el monorepo; bloquea smoke de integración de Ricardo. |

Regla de lectura: **implementación local ≠ DoD cumplido** cuando el Done exige
servicios o datos del entorno objetivo.

## 3. Matriz fase → tareas → precondiciones → entregables → validación → salida

### Fase 0 — Baseline de producto, seguridad y fixtures

| Campo | Contenido |
| --- | --- |
| Tareas | P0-03, P0-04, P0-31 |
| Precondiciones | Ninguna cloud; basta repositorio y ADR 0004 / 0018 / 0022. |
| Entregables | Product brief de Dispute Transaction Support (cliente Banco, usuarios cliente/operador, outcome, KPI de tiempo de resolución, trade-offs de autonomía/precisión/latencia/costo/HITL). Matriz versionada ALLOW / DENY / REQUIRE_APPROVAL con contratos Zod por acción simulada. Fixtures sintéticos de cliente, backoffice, sesión, caso y evidencia sin PII ni datos bancarios reales. |
| Validación | Revisión humana del brief y de la matriz; `bun test` sobre fixtures/contratos de capacidad; ausencia de secretos/PII en Git. |
| Criterio de salida | Contrato de demo y capacidades simuladas revisables **antes** de conectar datos o proveedores reales. Estados hoja: cerrar sólo si el DoD individual no exige BigQuery/GCP. |

Estado esperado tras cierre local: P0-03, P0-04 y P0-31 `COMPLETED` (DoD
local; sin dependencia BigQuery/GCP).

### Fase 1 — Evidencia del problema y línea base manual

| Campo | Contenido |
| --- | --- |
| Tareas | P0-01, P0-02, P0-05 |
| Precondiciones | Acceso BigQuery autorizado; población y periodo definidos; consultas versionadas en el pipeline o docs propietarias; salida de Fase 0 para fijar KPI/outcome. |
| Entregables | Distribución de motivos de contacto; volumen, frecuencia, severidad y temporalidad con filtros, denominador y limitaciones; baseline manual sobre el mismo snapshot (fórmula, población, exclusiones, resultado reproducible). |
| Validación | `query_id`, periodo, zona horaria y artefactos tabulares versionados; reproducción local del cálculo sobre el snapshot acordado; sin PII cruda en Git. |
| Criterio de salida | Decisión cuantitativa de viabilidad y benchmark contra el que se evaluará el agente. |

Estado esperado: las tres permanecen `IN PROGRESS` hasta ejecución autorizada en BigQuery; no se cierran con análisis históricos no versionados.

Estado tras ejecución autorizada 2026-10-04: consultas versionadas y baseline
manual publicados en
`data-ingestion-and-processing/docs/phase1-problem-baseline-20261004.md`
(población Transactions; p50=15d / p90=27d).

### Fase 2 — Contrato de datos y capa curada

| Campo | Contenido |
| --- | --- |
| Tareas | P0-06, P0-07, P0-08, P0-09, P0-10, P0-44 |
| Precondiciones | Metadata/snapshots BigQuery autorizados; IAM de lectura/escritura mínima; ADR 0009 / 0010 / 0020. |
| Entregables | Contratos por tabla (columnas, tipos, claves, nulabilidad, freshness, rechazo). Perfiles de calidad. Vistas/flujo `raw → stg → aux → cur` con proyección mínima, deduplicación, imputación reproducible (`*_was_imputed`), conteos y lineage. Manifests saneados (versión, hash, watermark, transformaciones, evidencia permitida). |
| Validación | Validador falla ante drift no permitido; pruebas de conteos; manifests con URI/generación/hash; ejecución sobre datos reales autorizados (no sólo fixtures locales). |
| Criterio de salida | Dataset curado aprobado, reproducible y apto para KDD, baseline y evaluación. |

Estado de partida (auditoría): implementación local en progreso; DoD cloud abierto.

Estado tras ejecución autorizada 2026-10-05: `bankai-pipeline --canonical-prepare
--run-id prepare-20261005-canonical` materializó `stg`/`aux`/`cur` desde
`hackathon` con contratos validados, perfiles agregados, imputación
`*_was_imputed` y `cur.preparation_runs`. P0-06–10 y P0-44 `COMPLETED` en hoja.

### Fase 3 — Ingesta administrada ADR 0020

| Campo | Contenido |
| --- | --- |
| Tareas | P0-37 (soporte de P0-09 y P0-10) |
| Precondiciones | Fase 2 con contratos/manifests definidos; imagen/job aprobables; APIs GCP; autorización explícita para dry-run y, por separado, para apply/deploy. |
| Entregables | Flujo declarado: S3 → Storage Transfer Service → GCS `raw/` → Eventarc → Cloud Tasks OIDC → `verified/` → BigQuery `ingestion_ledger` → Cloud Run Job. Idempotencia por `source_system + hash + generation`. Lease Firestore para serializar refresh/KDD/publicación. Bootstrap heredado sólo como vía manual no normativa; backend sin acceso a S3. |
| Validación | Dry-runs; pruebas de idempotencia; `terraform plan` (sin apply implícito); pipeline de PR bloquea contrato/tests/tipos/calidad/eval determinista sin secretos. |
| Criterio de salida | Plan e idempotencia validados. **Despliegue sólo tras autorización explícita.** P0-37 no se marca `COMPLETED` por código local o plan sin recursos verificados. |

### Fase 4 — KDD, experimentos y artefacto KG

| Campo | Contenido |
| --- | --- |
| Tareas | P0-11, P0-12, P0-13, P0-14, P0-15, P0-28, P0-45, P0-46 |
| Precondiciones | Dataset curado de Fase 2; job/publicación de Fase 3 disponible o dry-run equivalente autorizado; ADR 0011 / 0020. |
| Entregables | Documentación CRISP-DM/KDD; descubrimiento KDD y Naive Bayes exploratorio con splits sin leakage, métricas, exclusiones y provenance agregado; grafo sólo con asociaciones corroboradas por Apriori, FP-Growth y Eclat; `graph-vN.msgpack`, manifiesto y `current.json` en GCS (checksum, schema, tenant, catálogo); lector KG-RAG habilitado sólo tras validaciones. |
| Validación | Sin transacciones, reclamos, clientes, textos o scores individuales en el grafo; prueba Bun/Zod de lectura; rechazo de artefactos corruptos; C6–C8 siguen bloqueados. |
| Criterio de salida | C1–C5 exploratorios disponibles como evidencia de asociaciones. Publicación GCS y catálogo cerrado verificados antes de cerrar P0-15/P0-28/P0-46. |

Estado tras ejecución autorizada 2026-10-05: KDD `kdd-20261005-cur` sobre `cur`,
C1–C5 + suite, compile `graph-20261005-cur`, publish GCS con lease Firestore;
`current.json` actualizado. P0-11–15, P0-28, P0-45–46 `COMPLETED` en hoja.
graph-diff vs `kdd-20261004-fullpop` informativo (gate holdout_stable falló;
publish sin `--require-diff-pass`).

### Fase 5 — Composición productiva segura del backend

| Campo | Contenido |
| --- | --- |
| Tareas | P0-21, P0-22, P0-24, P0-25, P0-26, P0-29, P0-30, P0-35, P0-47 |
| Precondiciones | Credenciales e IAM autorizados; catálogo Structured/KG publicados cuando apliquen; dependencia externa de Auth (Harumi) para el camino Firebase real; ADR 0004, 0009–0012, 0016–0017, 0022. |
| Entregables | Composición opt-in completa: Firebase Auth, identidad Firestore/BigQuery cerrada, Firestore durable, Valkey efímero, BigQuery con catálogo, Vertex y Model Armor. Orden de compuertas: sesión → privacidad → Model Armor → JEV → catálogo → JEV especializado → policy → RAG/respuesta. Demo y baseline aislados; sin fallback a SQL libre, acciones bancarias reales ni persistencia insegura. |
| Validación | Integración autorizada: RBAC, cross-tenant, expiración, revocación, guardrails, límites BigQuery, checksum KG, fallo cerrado; contratos OpenAPI/inject sin depender de proveedores en CI de PR. |
| Criterio de salida | Suite de integración contra servicios autorizados en verde. Las tareas permanecen `IN PROGRESS` mientras sólo existan dobles locales. |

### Fase 6 — Evaluación, QA y salida controlada

| Campo | Contenido |
| --- | --- |
| Tareas | P0-39, P0-40, P0-48 |
| Precondiciones | Fases 0–5 con salidas cumplidas o explícitamente acotadas; fixtures sintéticos; ADR 0015. P0-40 ya `COMPLETED` y no se reabre. |
| Entregables | CI con contratos, pruebas Bun/Python, tipos, Biome y matriz determinista 48 core + 5 extensiones KG C1–C5. Comparación baseline vs flujo seguro (completitud, duración, intentos de recuperación, fallos, leaks) sólo con fixtures sintéticos o contenido previamente saneado. Evidencia E2E: normal, aclaración, HITL, OOD, caída de proveedor, inyección, aislamiento tenant y presupuesto; p50/p95 publicados. |
| Validación | PR sin proveedores externos; JEV real sólo manual/nocturno; métricas JEV informativas hasta baseline humana revisada. |
| Criterio de salida | Gates P0 publicados; P0-48 cierra cuando CI integra la matriz y el texto de hoja refleja “48 core + 5 extensiones KG C1–C5”; P0-39 cierra con evidencia E2E autorizada. |

## 4. Dependencias externas

### Frontend / Firebase (Harumi) — no asignadas en este plan

| ID | Rol en el plan de Ricardo/All |
| --- | --- |
| P0-16 | Scaffold Next.js + App Hosting. Ricardo no lo implementa; consume URL/origen públicos allowlisted. |
| P0-17 | Firebase Auth con usuarios demo. Ricardo verifica ID token en backend (P0-22/P0-47); no sustituye el scaffold. |
| P0-18–P0-20 | Chat cliente, consola operador y estados UI. Fuera de alcance de este plan; el backend expone OpenAPI/AsyncAPI y eventos HITL. |
| P0-38 | Despliegue frontend e integración GCP. Asignado a Ricardo en hoja, pero **bloqueado** por P0-16/P0-17/App Hosting. Este plan sólo documenta la interfaz y el smoke que Ricardo debe consumir. |

### Interfaz y smoke que Ricardo consume (P0-16 / P0-17 / P0-38)

1. Origen HTTPS del frontend allowlisted en CORS del backend.
2. Variables públicas mínimas (`API`/`WSS` URL, config Firebase pública); sin secretos en `NEXT_PUBLIC_*`.
3. Flujo Auth: ID token Firebase → cookie opaca/`SessionManager` → actor con tenant/rol/capability.
4. Smoke externo mínimo: health API, login demo, apertura de chat/WS autenticado, rechazo cross-origin y fallo cerrado sin token.
5. App Hosting no despliega backend ni habilita Structured/KG-RAG por sí mismo.

Hasta que ese smoke pase, P0-22/P0-38/P0-47 no pueden cerrarse por “demo local”.

### Otras dependencias fuera de Ricardo/All

Tareas Alexandra (StateGraph, Structured RAG, observabilidad, Model Armor/SDP,
IAM/red, transferencia S3, load raw, staging/curadas, ingesta incremental)
condicionan o refuerzan Fases 2–5. Este plan no las reasigna; si bloquean una
salida, la tarea de Ricardo/All permanece `IN PROGRESS` con nota de dependencia
en la columna `Respuesta` de la hoja.

## 5. Reglas para actualizar estados en la hoja

1. **Autoridad de DoD**: el Done de cada fila en `factored_tasks.xlsx` manda;
   este plan sólo ordena el cierre.
2. **Cloud pendiente ⇒ `IN PROGRESS`**: toda tarea cuyo Done cite BigQuery,
   GCS, Firestore, Valkey, Cloud Run, Firebase Auth/App Hosting o integración
   autorizada permanece `IN PROGRESS` (o `PENDING` si no arrancó) hasta
   validación en el entorno objetivo.
3. **Local no cierra cloud**: pruebas `bun test` / `pytest` / publicación
   emulada documentan progreso en `Respuesta`, no cambian a `COMPLETED` si
   falta el entorno.
4. **Excepciones ya cerradas**:
   - **P0-40** permanece `COMPLETED`.
   - **P0-32** permanece `COMPLETED` y **no se reabre** (taxonomía de errores;
     fuera de las fases activas).
5. **Actualización por fase**: las demás tareas pasan a `COMPLETED` sólo tras
   cumplir la **salida de su fase** y su **DoD individual**.
6. **P0-48 wording**: al actualizar, indicar explícitamente
   “48 core + 5 extensiones KG C1–C5”; no sustituir en silencio el conjunto base.
7. **Despliegues**: dry-run/plan pueden documentarse como avance; apply/deploy
   requieren tarea/autorización explícita y no se anticipan en este plan.

## 6. Checklist final de cierre P0 (Ricardo / All)

- [x] Fase 0: brief, matriz ALLOW/DENY/REQUIRE_APPROVAL y fixtures sintéticos
      versionados sin PII real.
- [x] Fase 1: consultas BigQuery versionadas + baseline manual reproducible
      sobre el mismo snapshot.
- [x] Fase 2: contratos, perfiles, capa curada, imputación y manifests
  (`prepare-20261005-canonical`; P0-06–10 y P0-44 `COMPLETED` en hoja)
      aprobados en BigQuery/GCS autorizados.
- [ ] Fase 3: flujo ADR 0020 declarado, idempotencia y plan Terraform
      validados; apply sólo con autorización.
- [x] Fase 4: KDD/NB exploratorios C1–C5; grafo agregado publicado;
      KG-RAG gated vía GCS (`graph-20261005-cur`); C6–C8 bloqueados.
- [ ] Fase 5: composición productiva opt-in; orden de compuertas verificado;
      demo/baseline aislados; integración RBAC/tenant/guardrails/KG/BQ.
- [ ] Fase 6: CI determinista; E2E de caminos críticos; p50/p95; JEV real
      manual/nocturno; P0-40 intacto.
- [ ] Dependencias Harumi: interfaz Auth/CORS/smoke documentada; P0-38 no
      cerrado sin App Hosting + Auth.
- [ ] Hoja `factored_tasks.xlsx` actualizada sin contradecir ADR; sin secretos
      ni PII en Git.
- [ ] Auditoría
      [`task-implementation-audit-20261004.md`](task-implementation-audit-20261004.md)
      contrastada al cierre (o supersedida por una auditoría nueva fechada).

## 7. Referencias ADR (sin reescritura normativa)

- [0004 — Control plane](adr/0004-agent-control-plane.md)
- [0009 — BigQuery / SQL autorizado](adr/0009-sql-customer-data-access.md)
- [0010 — Gobierno de datos a proveedores](adr/0010-provider-data-governance.md)
- [0011 — Structured RAG y KG-RAG](adr/0011-rag-trust-tenant-isolation.md)
- [0012 — Observabilidad sensible](adr/0012-sensitive-observability.md)
- [0015 — Evaluación y release gates](adr/0015-agent-evaluation-release-gates.md)
- [0016 — PII y desidentificación](adr/0016-pii-detection-and-deidentification.md)
- [0017 — Valkey y Firestore](adr/0017-valkey-firestore-durable-state.md)
- [0020 — Ingesta, KDD y grafo](adr/0020-ingestion-kdd-and-graph-pipeline.md)
- [0021 — Frontend / App Hosting](adr/0021-frontend-app-hosting-delivery.md)
- [0022 — Conversación realtime y demo](adr/0022-realtime-conversation-demo-integration.md)

Material de trazabilidad (no normativo): `planning/to-adopt/`,
`research/analisis-viabilidad-kg-dispute-transaction-support.md`,
`reconciliation-pre-observability.md`.
