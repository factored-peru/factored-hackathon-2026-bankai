# Deploy

Infraestructura y operación del monorepo.

```text
local/                  composición local de backend y Valkey
terraform/modules/      módulos reutilizables de infraestructura
terraform/environments/ entornos dev, staging y prod
```

Terraform debe aprovisionar Firebase/App Hosting, Cloud Run para backend,
Cloud Run Jobs y Functions para el pipeline, Cloud Scheduler, Eventarc, Cloud
Tasks, GCS, BigQuery, Firestore, Memorystore for Valkey, IAM, red privada,
secretos y observabilidad. Las imágenes de cada servicio se definen junto a su
código; esta carpeta solo las referencia.

Las decisiones de red, pipeline y frontend son ADR 0014, ADR 0020 y ADR 0021,
respectivamente.

## Guía de invocación

Ejecuta los comandos desde `deploy/`. El único artefacto operativo actual es
`local/backend-compose.yml`; los directorios Terraform son el contrato de la
infraestructura futura y aún no contienen archivos `.tf` aplicables.

| Objetivo | Comando | Estado y efecto |
| --- | --- | --- |
| Renderizar Compose | `docker compose -f local/backend-compose.yml config` | Disponible; exige `SERVICE_TOKEN` en el entorno. |
| Levantar backend y Valkey | `docker compose -f local/backend-compose.yml up --build` | Disponible; crea recursos locales y mantiene el proceso activo. |
| Detener ciclo local | `docker compose -f local/backend-compose.yml down` | Disponible; no usar `-v` sin autorizar eliminar volúmenes. |
| Inicializar Terraform | `terraform -chdir=terraform/environments/dev init -backend=false` | Disponible para validar el contrato local; descarga providers pero no crea recursos. |
| Validar Terraform | `terraform -chdir=terraform/environments/dev validate` | Disponible tras `init`; no crea recursos. |
| Revisar cambios | `terraform -chdir=terraform/environments/<entorno> plan` | Previsto; necesita backend, variables y credenciales autorizadas. |

`terraform apply`, destrucción de recursos, ejecución remota de jobs y cambios
de secretos no son validaciones locales y requieren autorización explícita. La
semántica de `config` y `down` está en la [referencia de Docker Compose](https://docs.docker.com/reference/cli/docker/compose/);
los flujos de Terraform están en la [referencia oficial de Terraform CLI](https://developer.hashicorp.com/terraform/cli/commands).
