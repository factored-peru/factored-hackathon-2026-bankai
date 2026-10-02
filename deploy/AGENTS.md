# AGENTS

- Lee `README.md` y la guía de invocación antes de usar Compose, Terraform o
  `gcloud`. `deploy/` declara infraestructura; no contiene lógica de negocio.
- La única invocación disponible hoy es la composición local. Ejecuta
  `docker compose -f local/backend-compose.yml config` antes de `up` y no
  documentes ni uses valores de secretos para satisfacer `SERVICE_TOKEN`.
- No hay configuración Terraform aplicable todavía. Cuando exista, comienza
  con `init -backend=false`, `validate` y `plan`; `apply`, `destroy` y cambios
  de recursos externos exigen autorización explícita.
- Conserva el límite de los ADR 0014, 0020 y 0021: Firebase App Hosting para
  frontend, Cloud Run para backend/jobs y la cadena Scheduler/Eventarc/Tasks
  para ingestión. No introduzcas Vercel ni atajos de despliegue fuera de esa
  arquitectura.
