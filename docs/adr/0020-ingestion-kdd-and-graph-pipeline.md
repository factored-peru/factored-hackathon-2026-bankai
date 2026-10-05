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

### Observación: bootstrap manual heredado

Se conserva `scripts/bootstrap_csv_to_bigquery.py` porque existía en una rama
de trabajo y documenta una vía útil para bootstrap local o inspección controlada
de `CSV -> GCS -> BigQuery`. No es la implementación de esta decisión: por
defecto sólo imprime un plan, pero su modo explícito `--execute` puede leer S3
directamente, usar una carpeta local, escribir GCS y cargar BigQuery con
`WRITE_TRUNCATE`. Esa ruta es no normativa, no se ejecuta automáticamente, no
debe recibir datos bancarios en producción y requiere autorización explícita.
La operación real debe pasar por el contrato administrado de este ADR y su
existencia no autoriza acceso del backend a S3 ni reemplaza el ledger,
`verified/`, validación de schema o idempotencia de la ingesta.

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
  exclusiones, soporte, confianza y lift. `train-naive-bayes` implementa el
  piloto local C1 de riesgo de SLA: extrae un subconjunto temporal y
  estratificado de 5,000 reclamos transaccionales, entrena Naive Bayes
  categórico suavizado y calibra la probabilidad en una partición temporal
  separada. `train-resolution-baseline` implementa C2 sobre un subconjunto de
  2,450 reclamos terminales y estima P50/P90 de `resolution_days` por cohorte
  de prioridad y canal, con fallback global. Ambos registran splits sin
  leakage, métricas y lineage agregado; no escriben filas, IDs ni scores
  individuales y no publican un modelo ni un umbral de acción.
- `train-fraud-baseline`, `train-interaction-risk` y
  `train-satisfaction-ordinal` completan C3, C4 y C5 como experimentos locales
  separados. C3 usa muestreo estratificado ponderado y compara contra el score
  existente; C4 mantiene targets independientes; C5 usa la escala ordinal
  observada. `evaluate-supervised-suite` sólo consolida manifests y bloqueos
  de C6–C8. `report-metrics` genera un rollup local de interpretabilidad
  (association vs supervised, conviction/leverage derivadas, gaps de CV) sin
  reentrenar ni consultar BigQuery. Ninguno publica, altera el backend o
  habilita automatización.
- KDD y Naive Bayes son evidencia exploratoria y provenance. No autorizan
  acciones, no cambian policy ni sustituyen JEV o validación determinista del
  backend.
- `compile-graph` v1 consume exclusivamente los artefactos KDD locales de un
  `run-id`. Valida los catálogos saneados y conserva solo reglas coincidentes
  de Apriori, FP-Growth y Eclat con iguales métricas de soporte, confianza y
  lift. AprioriHybrid se ejecuta como control de paridad/rendimiento frente a
  Apriori y no aporta un cuarto voto. K2 permanece fuera del grafo asociativo.
  Materializa nodos de población, feature, valor, regla y target; una regla es
  un nodo para preservar la conjunción de antecedentes. Escribe de forma
  determinista `graph-v1.msgpack` y `graph-manifest.json` bajo artefactos
  locales ignorados por Git. No vuelve a consultar BigQuery, no incorpora filas
  curadas, PII, texto, IDs ni relaciones heurísticas, y no publica el grafo.
- `publish` valida schema, manifest y checksum, publica el paquete inmutable
  `graph-v1.msgpack` + `graph-manifest.json` + `kg-operation-catalog.json` y
  actualiza `current.json` sólo después de una publicación completa y
  verificable. El adaptador local (`--publish-backend local --local-target`)
  emula el contrato para `demo-bankai`. El adaptador GCS
  (`--publish-backend gcs --gcs-bucket`) sube el mismo contrato a
  `{tenant}/{run_id}/*` y exige un lease Firestore
  (`pipeline_leases/{tenant_id}`) antes de escribir `current.json`. Dry-run no
  escribe local ni cloud. La ejecución cloud real sigue requiriendo
  autorización explícita, credenciales ADC y el bucket/IAM desplegados; no se
  asume `terraform apply`.
- `kdd` mina sobre la población completa de la ventana (sin subsample cuando
  `max_rows` cubre la población) y, con `[kdd.validation]` habilitado (default),
  parte temporalmente train/holdout, mina en train y recalcula
  support/confidence/lift en holdout. `n_folds > 1` añade estabilidad por
  bloques temporales. Los artefactos viven en `validation/`; el consenso que
  alimenta `compile-graph` permanece el de train.

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
recibe eventos S3/GCS ni accede a S3. El compilador local no habilita KG-RAG ni
es una publicación. La lógica de publicación GCS + lease está en el pipeline
Python; el backend lee el mismo contrato vía `GcsKnowledgeGraphArtifactRepository`
(`GCS_GRAPH_BUCKET` / tenant / prefix, inyectados por Terraform desde
`kg_artifacts`). Transfer/load cloud, imagen, Scheduler, Eventarc y el
`terraform apply` del bucket/IAM siguen pendientes de autorización explícita y
no se asumen desplegados.

## References

- https://docs.cloud.google.com/storage-transfer/docs/sources-and-sinks
- https://cloud.google.com/run/docs/create-jobs
- https://docs.cloud.google.com/run/docs/tutorials/eventarc
- https://docs.cloud.google.com/tasks/docs/dual-overview
- https://docs.cloud.google.com/bigquery/docs/loading-data-cloud-storage-csv
- `../../data-ingestion-and-processing/README.md`
