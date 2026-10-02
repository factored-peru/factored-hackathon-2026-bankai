# Backend

API y control plane online del asistente bancario.

## Stack

- Bun `>=1.4`, TypeScript estricto, Fastify 5 y Zod 4.
- LangGraph.js `StateGraph` para workflow online determinista; ReAct queda como
  decisión pendiente, no como loop activo.
- Firebase Admin para identidad; Firestore para estado durable.
- Memorystore for Valkey mediante `node-redis` para SessionManager y
  coordinación efímera.
- BigQuery para Structured RAG y GCS para artefactos versionados de KG-RAG.

La recuperación vectorial está desconectada: no existe corpus ni vector store
autorizado. Structured RAG y KG-RAG usan catálogos cerrados y fallan cerrados
hasta que sus adaptadores se implementen.

Python no forma parte de este proceso: el procesamiento y el grafo se producen
en `../../data-ingestion-and-processing/`.

## Estructura

```text
src/          configuración, dominio, HTTP, servicios e integraciones
config/       perfiles versionables
specs/        OpenAPI canónico
scripts/      validación y simulación TypeScript
tests/        pruebas de contrato y comportamiento
docs/         SDD, errores, SOLID y operación específica del backend
```

Las decisiones compartidas viven en `../../docs/adr/` y la arquitectura en
`../../docs/architecture-control-plane.md`.

## Comandos

```bash
bun install
bun run spec:check
bun test
bun run check-types
bun run check
```

Para desarrollo local con Valkey:

```bash
docker compose -f ../../deploy/local/backend-compose.yml up --build
```

El contrato público permanece en `specs/openapi.json`. Cambia primero la spec,
luego rutas, schemas Zod, pruebas y documentación.
