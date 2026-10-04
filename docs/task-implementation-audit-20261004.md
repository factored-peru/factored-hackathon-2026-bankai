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
| P0-13, P0-14, P0-15, P0-28 | En progreso local | Ontología agregada, compilador, publicación local, catálogo cerrado y lector GCS validable con dobles existen; falta publicación GCS y lease Firestore. |
| P0-21, P0-22, P0-24–26, P0-29, P0-30, P0-35, P0-47 | En progreso | Contratos, demo, guardrails, control plane, puertos y dobles están presentes; faltan composición productiva, Firebase/Firestore/Valkey reales y pruebas de integración contra servicios autorizados. |
| P0-40 | Completada P0 | Evaluadores TypeScript deterministas, sin proveedores ni contenido. |
| P0-48 | En progreso | 48 goldens base y 5 extensiones C1–C5; falta integrar el runner a CI y, posteriormente, la línea base humana. |
| P0-37 | Pendiente de activación | Terraform declarativo para backend, Job y bucket; falta imagen aprobada, APIs, recursos de ingesta, validación de provider y despliegue autorizado. |

## Decisiones preservadas

- El grafo sólo contiene asociaciones y provenance agregados; C6–C8 continúan
  bloqueados. No se materializan cliente, reclamo o transacción individual.
- El baseline comparativo no se convierte en vía autorizada y permanece fuera
  del `StateGraph`.
- La implementación actual no agrega DeepEval, LangSmith, Promptfoo,
  AgentEvals ni Langfuse. La decisión posterior para P0-33 adopta Langfuse
  Cloud US como visualizador OTel metadata-only, todavía sin SDK, claves,
  exportador, Docker ni tráfico configurado. OpenTelemetry y una futura
  persistencia BigQuery sólo aceptan metadata saneada.
- La transferencia S3→GCS, Eventarc, Cloud Tasks y `ingestion_ledger` siguen
  siendo responsabilidades de la ingesta ADR 0020 y no se sustituyen por un
  script local o acceso desde el backend.

## Actualización de la hoja de tareas

Al actualizar `factored_tasks.xlsx`, conservar las decisiones de los ADR y
usar `IN PROGRESS` para cada fila anterior. P0-40 permanece `COMPLETED`.
P0-48 debe indicar explícitamente “48 core + 5 extensiones KG C1–C5”, en vez
de interpretar el crecimiento de la cobertura como una sustitución silenciosa
del conjunto P0 base.
