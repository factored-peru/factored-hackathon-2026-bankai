# ADR 0011: Structured RAG y KG-RAG confiables por tenant

## Status

Accepted

## Context

Los datos estructurados, políticas y señales de conocimiento requieren una
respuesta explicable y aislada. La recuperación vectorial no forma parte del
MVP aprobado.

## Decision

El backend ofrece dos rutas de recuperación cerradas, invocadas únicamente por
la ruta autorizada en ADR 0004:

- Structured RAG carga un catálogo versionado de consultas cerradas con templates
  BigQuery autorizados según ADR 0009. El JEV Structured solo elige una opción
  de ese catálogo; policy valida la continuación antes de ejecutar el plan.
- KG-RAG carga primero un catálogo versionado de operaciones construido desde
  `graph-vN.msgpack`, manifiesto, checksum y `current.json` publicados por el
  pipeline en GCS. El JEV KG solo se invoca después de esa carga y policy valida
  la continuación antes de ejecutar la operación.

El backend deriva tenant, rol y alcance desde la sesión, valida los parámetros
con Zod y adjunta `EvidenceDTO` con origen, versión, filtros, relaciones y
métricas. Las rutas fallan cerradas si falta catálogo, versión, checksum,
schema, evidencia o autorización. El grafo no acepta consultas libres, y Naive
Bayes solo contribuye señales exploratorias/provenance, nunca autorización ni
acción automática.

## Consequences

Cada respuesta recuperada es reproducible y trazable. Qdrant y vector-RAG no
son dependencias ni rutas soportadas.
