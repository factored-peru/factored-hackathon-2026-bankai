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

## Guía de invocación

Todos estos comandos se ejecutan desde `app/backend/`. Bun `>=1.4` y las
dependencias son requisito previo; `bun install` actualiza el entorno local y
no debe sustituir el lockfile versionado.

```bash
bun install
bun run spec:check
bun test
bun run check-types
bun run check
```

| Objetivo | Comando | Efecto |
| --- | --- | --- |
| Desarrollo con recarga | `bun run dev` | Inicia el servidor vigilado; detener con `Ctrl+C`. |
| Ejecución sin vigilancia | `bun run start` | Inicia el servidor con la configuración activa. |
| Compilación | `bun run build` | Emite la compilación TypeScript de producción. |
| Contrato | `bun run spec:check` | Verifica OpenAPI sin modificar fuentes. |
| Calidad | `bun test`, `bun run check-types`, `bun run check` | Ejecuta pruebas, tipos y Biome de sólo comprobación. |
| Matriz de agente | `bun run agent:matrix` | Ejecuta la simulación declarada para variantes del agente. |

`bun run format` modifica archivos y sólo se usa cuando una tarea autorice el
formateo. Bun documenta los [scripts](https://bun.sh/docs/runtime) y las
[pruebas](https://bun.sh/docs/test) como estas invocaciones.

Para desarrollo local con Valkey, desde este directorio primero entrega
`SERVICE_TOKEN` por el entorno seguro y renderiza Compose; el archivo exige esa
variable incluso en el perfil local:

```bash
docker compose -f ../../deploy/local/backend-compose.yml config
docker compose -f ../../deploy/local/backend-compose.yml up --build
# al terminar
docker compose -f ../../deploy/local/backend-compose.yml down
```

No añadas `-v` a `down` salvo que la tarea autorice borrar volúmenes. Consulta
la referencia oficial de [Docker Compose](https://docs.docker.com/reference/cli/docker/compose/)
para el ciclo y sus efectos.

El contrato público permanece en `specs/openapi.json`. Cambia primero la spec,
luego rutas, schemas Zod, pruebas y documentación.
