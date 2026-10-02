# ADR 0020: Pipeline offline de ingesta, KDD y publicación de grafo

## Status

Accepted

## Context

El backend online no puede leer S3, transformar archivos ni entrenar modelos
durante una petición de usuario. La fuente estructurada canónica es BigQuery;
GCS conserva entradas y artefactos versionados. El sistema externo que escribe
en S3 no puede emitir notificaciones a SQS, por lo que la detección de nuevas
entradas requiere reconciliación programada. El pipeline actual declara sus
etapas y dependencias, pero todavía no implementa transferencias, cargas ni
infraestructura Terraform.

## Decision

El pipeline vive exclusivamente en `data-ingestion-and-processing/`, usa
Python 3.12 y se ejecuta como Cloud Run Job. No sirve HTTP ni comparte runtime,
imagen, sesión o credenciales con `app/backend/`.

Cada ejecución exige un `run-id` y sigue este orden:

```text
transfer -> load -> prepare -> kdd -> train-naive-bayes -> compile-graph -> publish
```

El cierre incremental es:

```text
Cloud Scheduler (15 min; lookback 30 min)
  -> reconciliador Cloud Run Function -> Storage Transfer Service: S3 -> GCS/raw
  -> GCS object.finalized -> Eventarc -> ingestion-dispatcher Cloud Run Function
  -> Cloud Tasks (OIDC) -> ingestion-worker Cloud Run Function
  -> GCS/verified inmutable + BigQuery raw + ingestion_ledger
  -> pipeline-refresh Cloud Task -> Cloud Run Job
```

- El reconciliador inicia una transferencia administrada y sin agentes de S3 a
  GCS cada 15 minutos. El lookback de 30 minutos detecta objetos que terminan
  cerca del corte. Cada ciclo registra manifest, hash de objeto, generación,
  checksum, conteos, watermark y fallos.
- Un evento `object.finalized` del prefijo raw activa Eventarc. La función
  `ingestion-dispatcher` solo valida el evento y encola una Cloud Task OIDC con
  ID determinista. Cloud Tasks no consulta S3 directamente.
- `ingestion-worker` valida prefijo, formato, tamaño, generación, checksum y
  schema. Copia la generación aceptada a `verified/` con nombre inmutable antes
  de ejecutar el load job, evitando una carrera si el objeto raw se sobrescribe.
- `load` crea o actualiza tablas raw de BigQuery sólo desde ese objeto verified.
  `prepare` materializa datos curados y auxiliares con deduplicación,
  normalización, imputación, reglas de calidad y lineage reproducibles.
- `ingestion_ledger` en BigQuery registra `source_system`, hash de objeto,
  generación, checksum, `run_id`, estado, job de carga, conteos, versión de
  schema y timestamps. No registra PII, paths sensibles ni contenido.
- La idempotencia usa `source_system + source_object_hash + gcs_generation`.
  Una Cloud Task repetida reanuda o devuelve el resultado registrado sin
  duplicar tabla raw, ledger ni refresh.
- `kdd` genera asociaciones, catálogo de features y targets, población,
  exclusiones, soporte, confianza y lift. `train-naive-bayes` registra split
  sin leakage, métricas, matriz de confusión y calibración cuando el modelo sea
  aplicable.
- KDD y Naive Bayes son evidencia exploratoria y provenance. No autorizan
  acciones, no cambian policy ni sustituyen JEV o validación determinista del
  backend.
- `compile-graph` transforma datos curados y resultados KDD en un artefacto
  interoperable. `publish` valida schema, manifest y checksum, publica
  `graph-vN.msgpack` y actualiza `current.json` sólo después de una publicación
  completa y verificable.

Tras una carga raw confirmada, `ingestion-worker` encola `pipeline-refresh`.
El orquestador inicia el Cloud Run Job con un nuevo `run-id`; el job adquiere un
lease transaccional en Firestore antes de preparar, ejecutar KDD o publicar. El
owner del lease es el único que puede actualizar `current.json`.

Un fallo de validación o carga registra estado `failed`, activa alerta y no
actualiza watermark, tablas curadas, grafo ni `current.json`. Los logs,
reportes y artefactos no incluyen PII cruda; contienen IDs saneados, lineage,
conteos, versiones y resultados de calidad. Las cuentas de servicio tienen
permisos mínimos y separados para Scheduler, Eventarc, Cloud Tasks, funciones,
Storage Transfer Service, GCS, BigQuery, Firestore y Cloud Run Job.

## Consequences

BigQuery es el único origen estructurado del backend; GCS entrega únicamente
artefactos publicados y validados conforme a ADR 0011. El backend Bun nunca
recibe eventos S3/GCS ni accede a S3. La implementación de las etapas, funciones
Python, colas, imagen, Scheduler y Terraform permanece pendiente en las tareas
P0 asociadas; ninguna de estas capacidades se asume desplegada.

## References

- https://docs.cloud.google.com/storage-transfer/docs/sources-and-sinks
- https://cloud.google.com/run/docs/create-jobs
- https://docs.cloud.google.com/run/docs/tutorials/eventarc
- https://docs.cloud.google.com/tasks/docs/dual-overview
- https://docs.cloud.google.com/bigquery/docs/loading-data-cloud-storage-csv
- `../../data-ingestion-and-processing/README.md`
