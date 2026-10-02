# Factored Hackathon 2026 — Bankai

Monorepo del asistente de soporte bancario. Separa explícitamente la experiencia
web, el control plane online, el procesamiento de datos offline y el despliegue.

## Estructura

```text
app/backend/                    API Bun/TypeScript y control plane
app/frontend/                   Next.js, React, Tailwind y Firebase
data-ingestion-and-processing/  pipeline Python 3.12 y manifiestos
deploy/                         Terraform, despliegue local y runbooks
docs/                           ADR, arquitectura, investigación y planificación
```

## Flujo de datos y ejecución

1. Storage Transfer Service copia CSV de S3 a GCS.
2. El pipeline Python carga, perfila, depura, imputa y publica tablas en
   BigQuery; luego compila un grafo versionado en GCS.
3. El backend Bun atiende peticiones autenticadas, usa Structured RAG mediante
   templates BigQuery y KG-RAG sobre el artefacto validado del grafo.
4. El frontend se despliega con Firebase App Hosting; backend y jobs se
   despliegan en Cloud Run mediante la infraestructura de `deploy/`.

Consulta `docs/README.md` para los límites de cada componente y
`docs/adr/README.md` para las decisiones aceptadas.

## Guía de invocación

Ejecuta cada comando desde su capa; no existe un comando único desde la raíz.
Las guías locales indican requisitos, validaciones y efectos.

| Capa | Estado | Entrada principal |
| --- | --- | --- |
| `app/backend/` | Disponible | `bun run dev`, validaciones Bun y Compose local |
| `app/frontend/` | Aún sin scaffold | Comandos Next.js previstos con Bun, no ejecutables todavía |
| `data-ingestion-and-processing/` | CLI disponible como contrato | `bankai-pipeline --dry-run` |
| `deploy/` | Compose local disponible; Terraform pendiente | `docker compose ... config` |
| `docs/` | Referencia y validación documental | lectura de ADR y comprobación de enlaces |

Los comandos que creen o modifiquen recursos cloud no son el flujo por defecto:
requieren autorización explícita, credenciales fuera de Git y los manifiestos
de infraestructura correspondientes. Las referencias externas utilizadas por
estas guías son [Bun](https://bun.sh/docs/runtime),
[Next.js CLI](https://nextjs.org/docs/app/api-reference/cli/next),
[Python `venv`](https://docs.python.org/3/library/venv.html),
[Docker Compose](https://docs.docker.com/reference/cli/docker/compose/),
[Terraform CLI](https://developer.hashicorp.com/terraform/cli/commands),
[Firebase App Hosting](https://firebase.google.com/docs/app-hosting) y
[Cloud Run Jobs](https://cloud.google.com/run/docs/execute/jobs).
