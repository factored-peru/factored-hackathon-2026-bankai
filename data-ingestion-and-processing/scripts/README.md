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

No existe bootstrap directo S3→GCS→BigQuery. `transfer` y `load` sólo se
habilitarán mediante el contrato administrado de ADR 0020: Storage Transfer
Service, evento GCS, validación/copia inmutable a `verified/`, Cloud Task OIDC,
ledger idempotente y carga BigQuery sin truncar tablas raw.
