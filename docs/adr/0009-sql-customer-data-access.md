# ADR 0009: Acceso estructurado autorizado con BigQuery

## Status

Accepted

## Context

La fuente canónica contiene datos financieros y personales. SQL generado por
un modelo o filtros elegidos por el cliente permitirían acceso indebido.

## Decision

El backend usa `@google-cloud/bigquery` detrás de un catálogo versionado de
`QueryPlan`. Cada plan declara `query_id`, template `SELECT` parametrizado,
parámetros Zod, columnas permitidas, límites de costo, rol, tenant y forma de
`EvidenceDTO`.

El servicio inyecta identidad y filtros autorizados; no acepta SQL, dataset,
tabla ni filtros arbitrarios desde el prompt o navegador. Las tablas raw,
curadas y auxiliares las publica exclusivamente el pipeline Python. Los logs
solo guardan métricas, identificadores saneados y provenance.

## Consequences

Las respuestas factuales usan consultas exactas y auditables. No se habilita
PostgreSQL ni SQL libre como mecanismo de recuperación del asistente.
