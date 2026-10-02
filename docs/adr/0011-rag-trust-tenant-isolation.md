# ADR 0011: Structured RAG y KG-RAG confiables por tenant

## Status

Accepted

Partially superseded by ADR 0020 for catalog loading and specialized JEV gates.

## Context

Los datos estructurados, políticas y señales de conocimiento requieren una
respuesta explicable y aislada. La recuperación vectorial no forma parte del
MVP aprobado.

## Decision

El backend ofrece dos rutas de recuperación cerradas:

- Structured RAG: templates BigQuery autorizados según ADR 0009.
- KG-RAG: operaciones versionadas que consumen `graph-vN.msgpack`, manifiesto,
  checksum y `current.json` publicados por el pipeline en GCS.

El backend deriva tenant, rol y alcance desde la sesión, valida los parámetros
con Zod y adjunta `EvidenceDTO` con origen, versión, filtros, relaciones y
métricas. El grafo no acepta consultas libres, y Naive Bayes solo contribuye
señales exploratorias/provenance, nunca autorización ni acción automática.

## Consequences

Cada respuesta recuperada es reproducible y trazable. Qdrant y vector-RAG no
son dependencias ni rutas soportadas.
