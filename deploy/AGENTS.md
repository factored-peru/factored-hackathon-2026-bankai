# AGENTS

- Lee `README.md` y la guía de invocación antes de usar Compose, Terraform o
  `gcloud`. `deploy/` declara infraestructura; no contiene lógica de negocio ni
  construye imágenes para cloud (eso vive en cada capa + GitHub Actions).
- Compose local: ejecuta `docker compose -f local/backend-compose.yml config`
  antes de `up` y no documentes ni uses valores de secretos para satisfacer
  `SERVICE_TOKEN`.
- Terraform aplicable vive en `terraform/environments/dev` (módulos `registry`,
  `runtime`, `state`). Empieza con `init -backend=false`, `validate` y `plan`.
  `apply`, `destroy`, push de imágenes, publish GCS y jobs cloud exigen
  autorización explícita.
- Preflight sin apply: `bash scripts/gcp-kg-ready.sh --check` y
  `bash scripts/gcp-productive-ready.sh --check`. Build local opcional:
  `--build-local` (delega a `publish-image.sh` de las capas).
- Docs: `docs/staging-flag-matrix.md`, `docs/image-digests.md`,
  `docs/github-wif.md`, `docs/state-bootstrap.md`.
- Conserva el límite de los ADR 0014, 0020 y 0021: Firebase App Hosting para
  frontend, Cloud Run para backend/jobs y la cadena Scheduler/Eventarc/Tasks
  para ingestión. No introduzcas Vercel ni atajos de despliegue fuera de esa
  arquitectura.
