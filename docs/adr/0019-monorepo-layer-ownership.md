# ADR 0019: Estructura de monorepo y propiedad de capas

## Status

Accepted

## Context

El repositorio inicialmente contenía la plantilla de backend bajo `app/`, pero
la solución incluye experiencia web, procesamiento offline, infraestructura y
documentación compartida. Esa estructura ocultaba límites de runtime y hacía
que los ADR pareciesen propiedad exclusiva del backend.

## Decision

La raíz Git es el límite del sistema y organiza los componentes así:

```text
app/backend/                    Bun/TypeScript online
app/frontend/                   Next.js/React/Tailwind
data-ingestion-and-processing/  Python 3.12 offline
deploy/                         Terraform y operación
docs/                           arquitectura y trazabilidad compartida
```

Los ADR, investigación y planificación pertenecen a `docs/`. Cada runtime
mantiene su README y `AGENTS.md`. `deploy/` referencia imágenes construidas en
las capas propietarias y no contiene lógica de producto. Los documentos en
`docs/planning/to-adopt/` son referenciales; los ADR prevalecen sobre sus
inconsistencias.

## Consequences

Los comandos deben ejecutarse desde la capa correspondiente. Los enlaces,
contextos Docker, Terraform y documentación deben usar rutas relativas a la
raíz Git, no a la ubicación histórica del backend.
