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
