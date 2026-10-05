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

El Job no se programa directamente. El flujo final lo invocará sólo desde el
refresh serializado que sigue a una carga raw confirmada; configurar un
Scheduler que ejecute KDD cada quince minutos violaría ADR 0020.
