# Scripts

El entrypoint es `bankai-pipeline` (o `python -m bankai_pipeline.cli`) y exige
`--run-id`. Sus etapas son `transfer`, `load`, `prepare`, `kdd`,
`train-naive-bayes`, `train-resolution-baseline`, `train-fraud-baseline`,
`train-interaction-risk`, `train-satisfaction-ordinal`, `compile-graph` y
`evaluate-supervised-suite`.

Las implementaciones deben producir manifests, checksums y lineage antes de
publicar artefactos consumibles por el backend.

`list_bigquery_tables.py` es una utilidad read-only de inventario. La etapa
`kdd` requiere `--kdd-config`; su configuración de ejemplo está en
`../config/kdd.toml.example` y no invoca `compile-graph` ni `publish`.

El archivo `bootstrap_csv_to_bigquery.py` se conserva como utilidad manual
histórica para inspección o bootstrap controlado. Por defecto hace `dry-run` y
no toca AWS, GCS ni BigQuery. Su modo `--execute` no forma parte del pipeline
normativo: puede leer S3 directamente, usar una copia local, escribir GCS y
cargar BigQuery con `WRITE_TRUNCATE`. Por tanto no debe usarse para producción,
reintentos ADR 0020 ni datos bancarios sin autorización explícita. La ruta
administrada de `transfer` y `load` sigue siendo obligatoria para operación
real: Storage Transfer Service, evento GCS, copia inmutable a `verified/`,
Cloud Task OIDC, ledger idempotente y carga BigQuery sin truncar tablas raw.
