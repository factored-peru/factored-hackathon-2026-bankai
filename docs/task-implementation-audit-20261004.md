# Auditoría de implementación P0 — Ricardo

Este documento contrasta las tareas de `planning/to-adopt` con ADR y código.
No sustituye los ADR ni convierte la hoja de cálculo en arquitectura normativa.

## Validación de partida

- Backend: `bun test` aprobó 219 pruebas y 992 assertions.
- Pipeline: `.venv/bin/python -m pytest` bajo Python 3.12 aprobó 28 pruebas.
- Terraform no pudo validarse en este workspace porque el ejecutable no está
  instalado; no se ejecutó `init`, `plan` ni ninguna operación cloud.

## Estado reconciliado

| Tareas | Estado real | Evidencia y siguiente cierre |
| --- | --- | --- |
| P0-06, P0-07 | En progreso | Contratos y perfiles agregados locales; faltan metadata real, freshness y drift sobre BigQuery autorizado. |
| P0-08, P0-09, P0-10, P0-44 | En progreso local | Preparación determinista, reglas de imputación y lineage existen; falta worker ADR 0020, vistas y tablas BigQuery. |
| P0-11, P0-12 | En progreso | KDD y el modelo CRISP-DM/KDD están documentados; la ejecución reproducible sobre datos curados depende del pipeline cloud. |
| P0-13, P0-14, P0-15, P0-28 | Codigo listo; ops pendientes | Ontología, compilador, publish local/**GCS+lease**, catálogo cerrado y lector GCS existen. Falta `terraform apply`, publish real autorizado y smoke Cloud Run. |
| P0-21, P0-22, P0-24–26, P0-29, P0-30, P0-35, P0-47 | En progreso | Contratos y dobles presentes; `ragRetrievalRuntime` y stores productivos (Firestore/GCS) se decoran en server cuando hay flags. Falta Auth Firebase end-to-end, Valkey prod y ruta HTTP agentic completa. |
| P0-40 | Completada P0 | Evaluadores TypeScript deterministas, sin proveedores ni contenido. |
| P0-48 | En progreso | 48 goldens base y 5 extensiones C1–C5; falta integrar el runner a CI y, posteriormente, la línea base humana. |
| P0-37 | Prep parcial | Módulo TF runtime (bucket/SA/Run/Job) + Dockerfile pipeline + script `deploy/scripts/gcp-kg-ready.sh`. Falta apply, imagen en AR, STS/Eventarc/Tasks/Functions e ingestion worker. |

## Decisiones preservadas

- El grafo sólo contiene asociaciones y provenance agregados; C6–C8 continúan
  bloqueados. No se materializan cliente, reclamo o transacción individual.
- El baseline comparativo no se convierte en vía autorizada y permanece fuera
  del `StateGraph`.
- La implementación actual no agrega DeepEval, LangSmith, Promptfoo ni
  AgentEvals. P0-33 (Alexandra) está implementada para los resultados de
  evaluación: `bun run eval:run -- --emit` envía un span por fixture a
  Langfuse Cloud US por OTLP/HTTP —con el exportador estándar de OpenTelemetry,
  sin el SDK `langfuse`, sin Docker self-host, sin callbacks ni
  autoinstrumentación— y persiste cada resultado versionado en BigQuery
  (ADR 0012 y 0015). Ambos canales son opt-in (`OTEL_ENABLED` y
  `LANGFUSE_ENABLED` juntos; `BIGQUERY_EVAL_DATASET`), pasan por una lista
  cerrada de atributos y sólo aceptan metadata saneada. Una ejecución real con
  fixtures sintéticos (2026-10-05) escribió 460 filas y 53 trazas visibles en
  Langfuse. Quedan fuera los spans del flujo conversacional completo (sesión,
  Model Armor, JEV, policy, retrieval): el contrato ya admite sus nombres, pero
  nada los emite todavía.
- La transferencia S3→GCS, Eventarc, Cloud Tasks y `ingestion_ledger` siguen
  siendo responsabilidades de la ingesta ADR 0020 y no se sustituyen por un
  script local o acceso desde el backend.

## Actualización de la hoja de tareas

Al actualizar `factored_tasks.xlsx`, conservar las decisiones de los ADR y
usar `IN PROGRESS` para cada fila anterior. P0-40 permanece `COMPLETED`.
P0-48 debe indicar explícitamente “48 core + 5 extensiones KG C1–C5”, en vez
de interpretar el crecimiento de la cobertura como una sustitución silenciosa
del conjunto P0 base.
