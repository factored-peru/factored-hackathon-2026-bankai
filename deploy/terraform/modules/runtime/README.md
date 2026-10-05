# Runtime module

Declara el backend Cloud Run, el Cloud Run Job offline, sus service accounts y
el bucket privado/versionado de artefactos KG. No habilita APIs, no crea
Scheduler/Eventarc/Cloud Tasks y no guarda secretos: esos elementos dependen
del worker de ingesta de ADR 0020 y de referencias a Secret Manager.

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
