# Documentación del sistema

## Directorios

- `adr/`: decisiones arquitectónicas vigentes.
- `planning/to-adopt/`: catálogo de tareas, decisiones y material de
  trazabilidad; no sustituye los ADR.
- `research/`: análisis de viabilidad de datos y recuperación.
- `architecture-control-plane.md`: fronteras, contratos y secuencia del
  control plane.

La documentación específica para construir y operar la API permanece en
`app/backend/docs/`. La de frontend, pipeline y despliegue vive junto a cada
componente y debe enlazar aquí cuando una decisión sea transversal.

## Guía de invocación

Esta carpeta no ejecuta una aplicación ni publica infraestructura. Su entrada
principal es la lectura y actualización controlada de Markdown y ADR; los
documentos bajo `planning/to-adopt/` sólo registran trazabilidad.

| Objetivo | Invocación o recorrido | Efecto |
| --- | --- | --- |
| Resolver decisión vigente | Leer `adr/README.md` y el ADR enlazado | Usa la decisión aceptada, no la planificación histórica. |
| Revisar arquitectura | Leer `architecture-control-plane.md` y los ADR citados | Contrasta fronteras y contratos transversales. |
| Encontrar referencias rotas | `rg -n '\]\([^)]+' --glob '*.md' .` | Inspección local de enlaces Markdown; no modifica archivos. |
| Validar una guía de capa | Abrir el `README.md` y `AGENTS.md` de su propietario | Confirma comandos, requisitos y efectos antes de invocar. |

No existe generador de sitio, linter Markdown ni comando de despliegue
configurado. Si se incorpora uno, debe declararse en este README y respetar que
los ADR son la autoridad normativa.
