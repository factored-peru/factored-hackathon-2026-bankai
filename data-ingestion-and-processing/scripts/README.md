# Scripts

El entrypoint es `bankai-pipeline` (o `python -m bankai_pipeline.cli`) y exige
`--run-id`. Sus etapas son `transfer`, `load`, `prepare`, `kdd`,
`train-naive-bayes`, `compile-graph` y `publish`.

Las implementaciones deben producir manifests, checksums y lineage antes de
publicar artefactos consumibles por el backend.
