# Data ingestion and processing

Pipeline offline en Python 3.12 para Dispute Transaction Support. No expone
endpoints ni participa en peticiones de usuario. La decisión normativa de stack, etapas y publicación vive en
`../docs/adr/0020-ingestion-kdd-and-graph-pipeline.md`.

## Índice de lectura (datos → KDD → grafo)

1. [`docs/crisp-dm-kdd-operating-model.md`](docs/crisp-dm-kdd-operating-model.md) — CRISP-DM ↔ etapas Bankai.
2. [`docs/phase1-problem-baseline-20261004.md`](docs/phase1-problem-baseline-20261004.md) — evidencia cuantitativa P0-01/02/05.
3. [`docs/kdd-dispute-transaction-support.md`](docs/kdd-dispute-transaction-support.md) — KDD, papers y run endurecido.
4. [`docs/futour-knowledge-graph-lessons.md`](docs/futour-knowledge-graph-lessons.md) — Apriori / FP-Growth / MultiLevel / FuTour.
5. [`docs/kg-rag-validation-20261004.md`](docs/kg-rag-validation-20261004.md) — artefacto KG local multi-algoritmo.
6. [`docs/kg-refresh-mlops.md`](docs/kg-refresh-mlops.md) — refresh batch, graph-diff y promote/rollback.
7. [`docs/prioritized-dispute-case-catalog.md`](docs/prioritized-dispute-case-catalog.md) — C1–C8 y bloqueos.

## Responsabilidades

1. Reconciliar la transferencia no destructiva de CSV desde S3 a GCS cada 15
   minutos y conservar manifest, watermark y lineage.
2. Procesar eventos `object.finalized` mediante Eventarc/Cloud Tasks, validar
   cada generación y cargar sólo objetos verified a tablas raw de BigQuery.
3. Perfilar, deduplicar, normalizar, crear tablas auxiliares e imputar datos
   según reglas estadísticas reproducibles.
4. Ejecutar KDD y exploración de Naive Bayes sin usarlo para decisiones online.
5. Compilar y publicar `graph-vN.msgpack`, manifiesto, checksum y `current.json`
   en GCS para consumo validado del backend.

`manifests/source_manifest.txt` contiene el inventario de entradas recibido.
El código irá bajo `src/`, los ejecutables bajo `scripts/` y las pruebas bajo
`tests/`.

Los contratos locales iniciales cubren `transactions` y `complaints`: validan
esquema y producen perfiles agregados, pero no conectan BigQuery ni contienen
valores de producción. La vinculación directa `complaint_id` → `transaction_id`
sigue siendo una limitación que debe resolverse en la fuente canónica, no por
inferencia en el pipeline.

## Guía de invocación

Ejecuta estas instrucciones desde `data-ingestion-and-processing/` con Python
3.12. El entorno virtual aísla dependencias y no se versiona.

```bash
python3.12 -m venv .venv
source .venv/bin/activate
python -m pip install -e .
bankai-pipeline --stage all --run-id local-dry-run --dry-run
```

Imagen Cloud Run Job: `Dockerfile` en esta carpeta. Build local:

```bash
docker build -t bankai-pipeline:local .
# o
bash scripts/publish-image.sh --build-local
```

Publicar digest a Artifact Registry:

```bash
export GCP_PROJECT_ID=… GCP_REGION=us-central1
bash scripts/publish-image.sh --push
```

Push y `terraform apply` requieren autorización. Preflight:
`../deploy/scripts/gcp-kg-ready.sh --check`. CI: `.github/workflows/publish-images.yml`.

El [módulo `venv` de Python](https://docs.python.org/3/library/venv.html)
documenta este aislamiento. Las etapas implementadas son `kdd`, C1
(`train-naive-bayes`), C2 (`train-resolution-baseline`), C3
(`train-fraud-baseline`), C4 (`train-interaction-risk`), C5
(`train-satisfaction-ordinal`), `compile-graph` y
`evaluate-supervised-suite`; siempre requieren `--run-id`.

La preparación dispone además de primitivas locales deterministas para
deduplicación, imputación y lineage. Hasta que ADR 0020 entregue `verified/` +
ledger, el modo autorizado `--canonical-prepare` materializa
`hackathon → stg → aux → cur` sobre el snapshot analítico aprobado (no sustituye
transfer/load ni escribe en `raw`). Sin ese flag, `prepare` permanece en dry-run
local. El modelo completo está en
[`docs/crisp-dm-kdd-operating-model.md`](docs/crisp-dm-kdd-operating-model.md).

| Objetivo | Comando | Estado y efecto |
| --- | --- | --- |
| Validar contrato de CLI | `bankai-pipeline --stage prepare --run-id local-dry-run --dry-run` | Disponible; no debe tocar fuentes externas. |
| Prepare canónico (dry-run) | `bankai-pipeline --stage prepare --run-id prepare-local-canonical --dry-run --canonical-prepare` | Disponible; describe `hackathon→stg/aux/cur` sin jobs. |
| Prepare canónico (BQ) | `bankai-pipeline --stage prepare --run-id prepare-YYYYMMDD-canonical --canonical-prepare` | Requiere autorización y ADC; crea datasets `stg`/`aux`/`cur` y manifests. |
| Ejecutar una etapa | `bankai-pipeline --stage <etapa> --run-id <id>` | Reservado: requiere implementación de etapa, autorización y credenciales. |
| Ejecutar ciclo completo | `bankai-pipeline --stage all --run-id <id>` | Reservado: puede transferir/publicar datos y disparar artefactos. |
| Inventario BQ (metadata) | `python scripts/list_bigquery_tables.py --project <id>` | Read-only; no lee filas. |
| Baseline Fase 1 (P0-01/02/05) | `python scripts/run_phase1_baseline.py --project factored-hackathon --dataset hackathon` | Agregados sin PII; `--dry-run` lista query_ids. |

Para KDD, copia `config/kdd.toml.example` a una ruta segura y ejecuta primero:

```bash
bankai-pipeline --stage kdd --run-id kdd-local-20261003 --kdd-config /ruta/kdd.toml --dry-run
```

La implementación compara Apriori, FP-Growth y Eclat (consenso del grafo) más
AprioriHybrid (paridad con Apriori) sobre transacciones y reclamos por
separado. Con `[kdd.validation]` (default ON) parte la ventana temporal en
train/holdout sobre la población completa (`max_rows` ≥ tamaño en ventana),
mina en train y recalcula métricas en holdout; escribe
`artifacts/kdd/<run-id>/validation/`. Su propuesta, límites y artefactos se
documentan en `docs/kdd-dispute-transaction-support.md`. La etapa local
`compile-graph` materializa sólo las reglas coincidentes entre los tres
consensuadores y la ontología agregada `Population`, `Feature`, `FeatureValue`,
`Target`, `Rule`, `Case` y `ModelRun`; no crea entidades individuales de
cliente, cuenta, comercio o disputa.

```bash
bankai-pipeline --stage compile-graph --run-id graph-local-20261003 \
  --kdd-artifact-dir artifacts/kdd/KDD_RUN_ID --dry-run
```

Sin `--dry-run`, la etapa escribe `graph-v1.msgpack` y `graph-manifest.json`
bajo `artifacts/graph/<run-id>/`. Para adjuntar provenance agregado de C1–C5,
añade `--supervised-suite-artifact-dir` y las cinco opciones
`--cN-artifact-dir`; sus checksums deben coincidir con el suite manifest.

Tras un prepare canónico exitoso, las poblaciones aprobadas para KDD/C1–C5 viven
en `cur` (configs `*.toml.example` usan `dataset = "cur"`). Los filtros de
categoría son case-insensitive porque prepare normaliza categóricos a `UPPER`.

## Publicación KG-RAG (local o GCS)

`publish --publish-backend local` emula el paquete inmutable y su `current.json`
para `demo-bankai` sin cloud.

```bash
bankai-pipeline --stage publish --run-id graph-local-20261003 \
  --publish-backend local \
  --graph-artifact-dir artifacts/graph/graph-local-20261003 \
  --local-target ../app/backend/.local/kg-rag --dry-run
bankai-pipeline --stage publish --run-id graph-local-20261003 \
  --publish-backend local \
  --graph-artifact-dir artifacts/graph/graph-local-20261003 \
  --local-target ../app/backend/.local/kg-rag
```

`publish --publish-backend gcs` usa el mismo contrato de manifiesto/checksum y
exige un lease Firestore (`pipeline_leases/{tenant}`) antes de escribir
`current.json`. Dry-run valida y lista URIs; la ejecución real requiere ADC,
bucket existente e IAM (SA pipeline con objectAdmin + datastore.user). No
ejecutar sin autorización explícita.

```bash
bankai-pipeline --stage publish --run-id graph-local-20261003 \
  --publish-backend gcs \
  --graph-artifact-dir artifacts/graph/graph-local-20261003 \
  --gcs-bucket <kg-artifacts-bucket> \
  --kg-tenant-id demo-bankai --dry-run
```

El paquete contiene el grafo, manifiesto, catálogo de operaciones y hashes.

## Piloto C1: incumplimiento de SLA

`train-naive-bayes` implementa únicamente el baseline offline C1. Copia
`config/c1.toml.example` a una ruta local segura; el ejemplo define 5,000
reclamos transaccionales muestreados de forma determinista y separados por
tiempo. No descarga la población completa, no persiste filas ni identificadores
y no produce una decisión operativa.

```bash
bankai-pipeline --stage train-naive-bayes --run-id c1-local-20261003 \
  --c1-config /ruta/c1.toml --dry-run
```

Sin `--dry-run` consulta sólo las tres ventanas y tamaños declarados en la
configuración. Escribe `c1-model.json` y `c1-manifest.json` en
`artifacts/c1/<run-id>/`, con métricas agregadas, lineage y configuración; no
publica GCS, no actualiza BigQuery, no envía scores al backend y no modifica el
grafo. El umbral 0.5 del reporte sirve sólo para interpretar una matriz de
confusión: ningún umbral de priorización está aprobado.

## Piloto C2: duración de resolución

`train-resolution-baseline` calcula P50/P90 de `resolution_days` sólo sobre
reclamos terminales `Resolved` y `Closed`. `status` se usa exclusivamente para
seleccionar etiquetas históricas, nunca como predictor. El baseline usa
cohortes `priority + reception_channel`, con fallback a prioridad y global.

```bash
bankai-pipeline --stage train-resolution-baseline --run-id c2-local-20261003 \
  --c2-config /ruta/c2.toml --dry-run
```

El ejemplo `config/c2.toml.example` limita el piloto a 2,450 filas temporales.
La ejecución escribe `c2-quantile-baseline.json` y `c2-manifest.json` en
`artifacts/c2/<run-id>/`. No persiste filas, IDs o predicciones individuales;
no publica, no modifica BigQuery ni conecta C2 al backend o al grafo.

## Suite C3–C5 y consolidado

C3 pondera por clase para recuperar la prevalencia real de fraude y compara su
baseline con `fraud_score`; C4 entrena seguimiento y escalamiento por separado;
C5 usa `main_score` ordinal 1–7 mediante el join canónico `interaction_id`.

```bash
bankai-pipeline --stage train-fraud-baseline --run-id c3-local-20261003 --c3-config /ruta/c3.toml --dry-run
bankai-pipeline --stage train-interaction-risk --run-id c4-local-20261003 --c4-config /ruta/c4.toml --dry-run
bankai-pipeline --stage train-satisfaction-ordinal --run-id c5-local-20261003 --c5-config /ruta/c5.toml --dry-run
```

`evaluate-supervised-suite` consolida hashes, versiones y bloqueos de C6–C8
desde los cinco manifiestos; no lee BigQuery ni publica resultados.

## Informe de interpretabilidad

`report-metrics` lee artefactos KDD + C1–C5 + suite (+ grafo opcional) y
escribe un reporte saneado con métricas asociativas derivadas (incl. conviction
y leverage) separadas de las métricas supervisadas. No consulta BigQuery.

```bash
bankai-pipeline --stage report-metrics --run-id metrics-local-20261004 \
  --kdd-artifact-dir artifacts/kdd/KDD_RUN_ID \
  --supervised-suite-artifact-dir artifacts/supervised-suite/SUITE_RUN_ID \
  --c1-artifact-dir artifacts/c1/C1_RUN_ID \
  --c2-artifact-dir artifacts/c2/C2_RUN_ID \
  --c3-artifact-dir artifacts/c3/C3_RUN_ID \
  --c4-artifact-dir artifacts/c4/C4_RUN_ID \
  --c5-artifact-dir artifacts/c5/C5_RUN_ID \
  --graph-artifact-dir artifacts/graph/GRAPH_RUN_ID \
  --dry-run
```

Sin `--dry-run` escribe `interpretability-report.json` y `.md` bajo
`artifacts/reports/<run-id>/`.

## Diff y gate de promote

`graph-diff` compara KDD previous vs candidate (Jaccard de reglas consenso,
altas/bajas, deltas de métricas, `row_count` vía
`population-support-snapshot.json`, holdout si existe `validation/`) y escribe
un reporte con gate configurable. Runbook:
[`docs/kg-refresh-mlops.md`](docs/kg-refresh-mlops.md).

```bash
bankai-pipeline --stage graph-diff --run-id diff-local-20261004 \
  --previous-kdd-artifact-dir artifacts/kdd/PREV_RUN \
  --candidate-kdd-artifact-dir artifacts/kdd/CAND_RUN \
  --diff-output artifacts/diff/diff-local-20261004/graph-diff.json
```

`publish --require-diff-pass --diff-report <path>` falla cerrado sin tocar
`current.json` si `gate.passed` no es true.

El cierre automatizado descrito en ADR 0020 invocará el job desde GCP, no desde
una estación local. Como referencia de operación controlada, un job ya creado
se ejecuta con `gcloud run jobs execute <JOB> --region <REGION> --wait`; requiere
el rol de invocación y no debe usarse para crear infraestructura. Consulta la
[documentación oficial de Cloud Run Jobs](https://cloud.google.com/run/docs/execute/jobs).

## Descubrimiento read-only de BigQuery

La utilidad `scripts/list_bigquery_tables.py` sirve para inspeccionar únicamente
identificadores de dataset/tabla y tipo de tabla. No ejecuta SQL, no descarga
filas, schemas ni valores, y no modifica recursos. Usa las Application Default
Credentials locales ya configuradas.

```bash
python3.12 scripts/list_bigquery_tables.py --project factored-hackathon --dry-run
python3.12 scripts/list_bigquery_tables.py --project factored-hackathon
# para limitar la visibilidad a un dataset
python3.12 scripts/list_bigquery_tables.py --project factored-hackathon --dataset DATASET_ID
```

La cuenta necesita `roles/bigquery.metadataViewer` en el proyecto o el alcance
equivalente de menor privilegio. El resultado sólo debe usarse para definir
contratos y vistas curadas; nunca se versiona como inventario operativo ni se
incluyen valores de producción.
