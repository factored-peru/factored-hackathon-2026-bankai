# Terraform

Módulos aplicables: `registry` (Artifact Registry + SA CI), `runtime` (Cloud Run
+ KG), `state` (Firestore + Memorystore + uploads + VPC connector). El mapa ADR
completo (`frontend`, `data`, `network`, `observability`) sigue parcialmente
pendiente.

Cada entorno declara proyecto, región, nombres de recursos, cuentas de servicio
y referencias a secretos, nunca valores secretos. Matriz staging:
[`../docs/staging-flag-matrix.md`](../docs/staging-flag-matrix.md). Digests:
[`../docs/image-digests.md`](../docs/image-digests.md).

Antes de aplicar cambios se ejecutan `terraform fmt -check` y
`terraform validate` desde el directorio del entorno. Preflight:
`bash ../scripts/gcp-productive-ready.sh --check`.

`environments/dev` compone `registry` + `state` + `runtime`: Artifact Registry,
backend Cloud Run, Job offline, SA, bucket KG, Firestore, Memorystore, bucket
uploads, IAM de pull para runtimes y permisos de update de imagen para la SA
GitHub CI. Scheduler, Storage Transfer, Eventarc, Cloud Tasks, ledger y refresh
siguen fuera hasta ADR 0020 de ingesta. `terraform apply` exige autorización
explícita; CI no aplica TF — solo publica digests y puede actualizar la imagen
de Cloud Run/Job.
