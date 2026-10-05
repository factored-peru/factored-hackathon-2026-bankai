# Runtime module

Declara el backend Cloud Run, el Cloud Run Job offline, sus service accounts y
el bucket privado/versionado de artefactos KG. Cuando el entorno pasa
`upload_bucket_name`, `kv_url` y `vpc_connector_id` desde el módulo `state`,
inyecta la matriz productiva (`FIRESTORE_ENABLED`, `GCS_UPLOAD_*`,
`SESSION_STORE_ENABLED`, `KV_*`) y adjunta el Serverless VPC Access connector.

La imagen del service/job tiene `lifecycle.ignore_changes` para que CI pueda
rotar digests sin que el próximo `apply` los revierta. Terraform sigue siendo
dueño de env, VPC e IAM.

No habilita APIs, no crea Scheduler/Eventarc/Cloud Tasks y no guarda secretos:
`SERVICE_TOKEN` y `PRIVATE_DATA_ENCRYPTION_KEY` viven en Secret Manager / CI.
Ver [`docs/staging-flag-matrix.md`](../../../docs/staging-flag-matrix.md).

`evaluation_results.tf` declara el dataset `evaluation_dataset_id` (por defecto
`bankai_evaluation`, aparte del dataset de datos de clientes) y la tabla
`evaluation_results`, particionada por día en `recorded_at` y agrupada por
`route` y `metric`, con protección contra borrado. Su esquema
(`evaluation_results_schema.json`) refleja el registro versionado `v1` del
backend (ADR 0015) y una prueba del backend detecta cualquier divergencia. La
cuenta del backend recibe un rol personalizado de sólo inserción
(`bigquery.tables.updateData`) enlazado a esa tabla, no un rol de edición de
datos. El módulo no inyecta `BIGQUERY_EVAL_DATASET` en el backend: se activa con
`backend_environment`, junto con `BIGQUERY_ENABLED`. Estas declaraciones no se
han validado con `terraform validate` ni aplicado; hacerlo exige autorización.

El Job no se programa directamente. El flujo final lo invocará sólo desde el
refresh serializado que sigue a una carga raw confirmada; configurar un
Scheduler que ejecute KDD cada quince minutos violaría ADR 0020.
