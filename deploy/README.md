# Deploy

Infraestructura y operación del monorepo. **No construye imágenes para cloud**:
cada capa propietaria publica digests; aquí solo se provisiona y se hace pull.

```text
local/                  composición local de backend y Valkey (+ capas de chat)
docs/                   flags, digests, WIF, bootstrap de estado
scripts/                preflight GCP (KG + productive; sin apply)
terraform/modules/      registry + runtime + state
terraform/environments/ entorno dev (staging/prod pendientes)
```

Terraform:

- `registry`: Artifact Registry Docker + SA GitHub CI (writer).
- `runtime`: bucket KG, SA, Cloud Run, Job; inyecta `GCS_GRAPH_BUCKET` y flags
  productivos cuando `state` está cableado.
- `state`: Firestore, Memorystore, VPC connector, bucket de uploads.

CI Git→GCP: [`.github/workflows/`](../.github/workflows/) (PR checks + publish
images). WIF: [`docs/github-wif.md`](docs/github-wif.md). Digests:
[`docs/image-digests.md`](docs/image-digests.md). Estado local/nube:
[`docs/state-bootstrap.md`](docs/state-bootstrap.md).

La cadena ADR 0020 (STS S3→GCS, Eventarc, Tasks, Functions) **aún no** está en
`.tf`. Matriz de flags:
[`docs/staging-flag-matrix.md`](docs/staging-flag-matrix.md).

## Guía de invocación

Ejecuta los comandos desde `deploy/`.

| Objetivo | Comando | Estado y efecto |
| --- | --- | --- |
| Renderizar Compose | `docker compose -f local/backend-compose.yml config` | Disponible; exige `SERVICE_TOKEN` en el entorno. |
| Levantar backend y Valkey | `docker compose -f local/backend-compose.yml up --build` | Disponible; crea recursos locales. |
| Chat de demo en contenedor | `docker compose -f local/backend-compose.yml -f local/chat-compose.yml up --build` | Disponible; perfil `dev` con demo en memoria, sin nube ni credenciales. Prueba con `bun run chat:try -- --url http://localhost:8010` desde `app/backend/`. |
| Baseline real en contenedor | `docker compose -f local/backend-compose.yml -f local/chat-compose.yml -f local/baseline-live-compose.yml up --build` | **Llama a Vertex AI y BigQuery reales** con tus credenciales ADC (`GOOGLE_ADC_FILE`, de sólo lectura) y puede enviar telemetría a Langfuse y BigQuery. Se factura; texto sintético. Se niega a arrancar si falta una variable requerida. |
| Preflight KG GCP | `bash scripts/gcp-kg-ready.sh --check` | Valida Dockerfiles/scripts + `terraform validate`; **no build, no apply**. |
| Build local (opcional) | `bash scripts/gcp-kg-ready.sh --build-local` | Delega a `*/scripts/publish-image.sh --build-local`. |
| Preflight productive | `bash scripts/gcp-productive-ready.sh --check` | Valida registry/state/runtime + GHA + matriz; **no apply**. |
| Publish GCS dry-run | `GCS_GRAPH_BUCKET=… bash scripts/gcp-kg-ready.sh --dry-run-publish` | Valida paquete; no escribe. |
| Publish GCS real | `GCS_GRAPH_BUCKET=… bash scripts/gcp-kg-ready.sh --execute` | **Requiere autorización + ADC + Firestore lease**. |
| Terraform init/validate | `terraform -chdir=terraform/environments/dev init -backend=false && terraform -chdir=… validate` | Sin crear recursos. |
| Terraform plan | `terraform -chdir=terraform/environments/dev plan` | Credenciales y tfvars reales. |

Push de imágenes: desde la capa dueña (`app/backend/scripts/publish-image.sh
--push` o pipeline). `terraform apply`, publish GCS `--execute` y jobs cloud
requieren autorización explícita y credenciales fuera de Git.

## Camino minimo grafo-en-GCP

1. Apply TF (registry + runtime + state) con digests reales ([image-digests.md](docs/image-digests.md)).
2. Push vía scripts de capa o GitHub Actions `publish-images`.
3. Publish grafo: `--publish-backend gcs`.
4. Cloud Run con `GCS_ENABLED=true` + tenant; smoke lectura `current.json`.

## Camino productive (sesiones + usuarios + chat demo)

Ver [state-bootstrap.md](docs/state-bootstrap.md) y
[staging-flag-matrix.md](docs/staging-flag-matrix.md).
