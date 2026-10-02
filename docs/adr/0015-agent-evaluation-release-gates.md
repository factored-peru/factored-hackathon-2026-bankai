# ADR 0015: Evaluación TypeScript y gates de release

## Status

Accepted

Partially superseded by ADR 0020 and `docs/planning/evals.md`.

## Context

Las pruebas unitarias no bastan para validar rutas agentic, recuperación,
privacidad y evaluación de respuestas antes de liberar cambios.

## Decision

Las suites de evaluación viven y se ejecutan en TypeScript dentro del entorno
del backend. DeepAgents se permite exclusivamente para construir o ejecutar
escenarios de evaluación offline; JEV-as-Judge evalúa resultados saneados. No
son subagentes de producción ni obtienen herramientas bancarias.

Cada release evalúa rutas Structured RAG, KG-RAG, herramientas, HITL, rechazo,
prompt injection, fallos de Model Armor, aislamiento tenant y presupuesto. Los
resultados saneados se guardan en BigQuery con versión de prompts, grafo,
templates, política y build.

## Consequences

La promoción requiere umbrales definidos de seguridad, precisión, latencia y
costo; un fallo crítico bloquea la liberación.
