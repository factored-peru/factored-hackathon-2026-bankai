# Estado P0 por responsable y contraste GCP

Fecha de comprobación: 2026-10-05 (refresh vespertino, sólo lectura). Este
documento es evidencia operativa, no reemplaza los ADR ni convierte la hoja de
tareas en arquitectura normativa. Las comprobaciones GCP no leyeron contenido
de Firestore, resultados BigQuery ni valores de secretos.

## Snapshot

- Git: `main` / `origin/main` incluyen refresh documental post-Publish images y
  el cierre Fase 2 canónico (`prepare-20261005-canonical`).
- Proyecto activo: `factored-hackathon` en estado `ACTIVE`.
- Región operativa observada: `us-central1` para Firestore, Cloud Run, Redis,
  VPC Access, Artifact Registry, buckets y datasets BigQuery.
- Publish images: reintento de
  [37366452866](https://github.com/factored-peru/factored-hackathon-2026-bankai/actions/runs/37366452866)
  (fallo previo por *hosted runner not acquired*) → **success**; backend
  revision `bankai-backend-00010-zxt`. Nota operativa en
  `deploy/docs/github-wif.md`.
- Prepare canónico: `bankai-pipeline --stage prepare --canonical-prepare
  --run-id prepare-20261005-canonical` materializó `stg`/`aux`/`cur` desde
  `hackathon` (no escribe `raw`; no sustituye ADR 0020).

## Recursos confirmados

| Área | Evidencia observada | Implicación P0 |
| --- | --- | --- |
| Estado durable | Firestore Native `(default)` | Existe la base durable de ADR 0017. |
| Runtime | Cloud Run `bankai-backend` Ready (rev `bankai-backend-00010-zxt`); URL `https://bankai-backend-ac5skzrjqq-uc.a.run.app`; `/v1/health/ready` → 200; imagen `…/bankai/backend@sha256:76211ea7aa0e7f3f0436149f2c8aae023a556dbac0a155b6673659c1969a0044`; Job `bankai-pipeline` creado | P0-37 parcial; no se observaron ejecuciones del Job. |
| Chat baseline vivo | `CHAT_ENABLED=true`, `CHAT_PIPELINE=baseline`, `BASELINE_CHAT_ENABLED=true`, `AGENTIC_CHAT_ENABLED=false`, `VERTEX_AI_ENABLED=true` (`gemini-2.5-flash`), `BIGQUERY_ENABLED=true`, `DEMO_AUTH_ENABLED=true`, `REALTIME_ENABLED=true`, `FIRESTORE_ENABLED=true`, `SESSION_STORE_ENABLED=true`, Valkey vía `KV_PROVIDER=valkey` | Smoke demo/baseline no cierra DoD de Fases 5–6 ni agentic (P0-21–30, P0-35, P0-47). |
| Registro e imágenes | Repositorio Docker `bankai` en Artifact Registry | Destino de publicación para backend y pipeline. |
| Estado efímero y red | Redis `bankai-sessions` y conector `bankai-vpc` listos | Valkey/VPC existen para P0-30/P0-47. |
| Almacenamiento KG | `gs://…-kg-…/demo-bankai/current.json` → `graph-20261004-fullpop-ci` con `graph-v1.msgpack`, `graph-manifest.json`, `kg-operation-catalog.json` | Artefacto publicado; DoD P0-15/28/46 sigue abierto sin lease Firestore y sin habilitar KG-RAG productivo cerrado. |
| Datos | Datasets `hackathon`, `raw`, `stg`, `aux`, `cur`, `bankai_evaluation`. Capas curadas con TX/complaints/CCI/surveys + `cur.preparation_runs`. `raw` sigue sólo `branches` + `complaints` | Fase 2 (P0-06–10, P0-44) cerrada vía snapshot canónico. ADR 0020 raw ingest sigue abierto (Alexandra). |
| Identidad frontend | Firebase asociado al proyecto | Sin App Hosting / frontend desplegado. |
| Secretos | Refs Secret Manager: `SERVICE_TOKEN`, `PRIVATE_DATA_ENCRYPTION_KEY`, `DEMO_ACTOR_HMAC_KEY`, Langfuse; Cloud Run SA con acceso | Inyección principal fuera de Git. **No** existe secreto homónimo para el correlador. |

## Brechas verificadas

| Brecha | Evidencia | Tareas afectadas |
| --- | --- | --- |
| Ingesta ADR 0020 / raw incompleto | `raw` sólo `branches` + `complaints`; Eventarc/Cloud Tasks/STS/Scheduler no habilitados | P0-41–43, P0-49 (no bloquea capa `cur` canónica) |
| Guardrails no verificables | Model Armor API habilitada; la identidad de comprobación no listó templates | P0-25, P0-29, P0-34 |
| Telemetría requiere reconciliación | `TELEMETRY_CORRELATOR_KEY` sigue como variable de entorno plana en Cloud Run; `OTEL_ENABLED`/`LANGFUSE_ENABLED` en `false`; sin secreto homónimo | P0-33, P0-36. Migrar a Secret Manager **antes** del próximo `terraform apply` (ADR 0012 + `deploy/docs/live-telemetry-handoff.md`). |
| Frontend pendiente | Sin App Hosting ni frontend desplegado | P0-16–20, P0-38 |
| KG-RAG / lease | Artefacto en GCS presente; `KG_RAG_LOCAL_ENABLED=false`; lease Firestore de publicación no verificado en este refresh | P0-15, P0-28, P0-46 |
| KDD aún sobre `hackathon` | `cur` es la fuente aprobada siguiente; KDD config de ejemplo sigue en `hackathon` hasta Fase 4 | P0-11–14, P0-45–46 |

## Vivo vs DoD abierto

| Observado vivo | No implica COMPLETED |
| --- | --- |
| Baseline chat + Vertex + BigQuery + demo auth en Cloud Run | Fases 5–6 (Auth Firebase productivo, agentic, Model Armor, E2E, HITL) |
| KG `current.json` + msgpack en GCS | Fases 3–4 DoD restante (ADR 0020 raw, lease Firestore, KDD sobre `cur`, catálogo productivo cerrado) |
| `stg`/`aux`/`cur` + `preparation_runs` | Cierra P0-06–10/P0-44; **no** cierra P0-41–43 ni KDD/grafo |
| Firestore + Valkey provisionados | P0-47 SessionManager verificado E2E en stores reales |
| Imagen AR + servicio Ready | P0-37 cierre completo (Job ejecutado, ingesta, plan/apply reconciliado) |

## Cierre por responsable

### Ricardo

| Estado | Cierre pendiente |
| --- | --- |
| Datos y preparación | **COMPLETED** en hoja para P0-06–10 y P0-44 (`prepare-20261005-canonical`). |
| KDD y grafo | KDD/Naive Bayes sobre `cur` y cerrar publicación con lease Firestore (P0-11–15, P0-45–46). |
| Backend productivo | Firebase Auth/RBAC, composición agentic, proveedores aprobados, pruebas de integración; demo baseline no sustituye (P0-21–22, P0-24–30, P0-35, P0-47). |
| Evaluación | 48 golden cases + 5 extensiones KG C1–C5 en CI y baseline humana antes de umbrales bloqueantes (P0-48). |

### Alexandra

| Estado | Cierre pendiente |
| --- | --- |
| Control plane | Conectar StateGraph al runner de conversación productivo (P0-23). |
| Observabilidad y guardrails | Model Armor/SDP autorizados; telemetría saneada sólo tras correlador en Secret Manager (P0-33–34). |
| Infraestructura | Declarar/importar recursos, `plan` revisado y apply autorizado de IAM/secretos/red/Run/Job (P0-36–37). |
| Ingesta administrada | STS → GCS → Eventarc → Cloud Tasks → worker → BigQuery (P0-41–43, P0-49). |

### All

| Estado | Cierre pendiente |
| --- | --- |
| Calidad transversal | QA E2E, resiliencia, aislamiento y HITL en entorno integrado (P0-39). |
| Sesiones | SessionManager con Firestore y Valkey reales, recuperación y coordinación (P0-47). |
| Alcance posterior | Voz y documentos permanecen P1; no bloquean el cierre P0. |

## Próxima secuencia segura

1. Corregir la referencia del correlador como secreto y ejecutar un `terraform
   plan` revisado, sin aplicar mientras proponga eliminar configuración útil
   (ver `deploy/docs/live-telemetry-handoff.md`).
2. Habilitar y desplegar la cadena de ingesta ADR 0020 hacia `raw` (Alexandra);
   la capa `cur` canónica ya existe y no debe borrarse en un apply.
3. Apuntar KDD a `cur`, ejecutar KDD reproducible, confirmar lease Firestore y
   habilitar sólo las operaciones KG-RAG permitidas.
4. Completar identidad, guardrails y control plane productivo; después ejecutar
   la batería E2E y la baseline humana.

Las acciones que escriben recursos GCP, ejecutan cargas BigQuery o activan
proveedores requieren autorización y credenciales apropiadas fuera de Git.
