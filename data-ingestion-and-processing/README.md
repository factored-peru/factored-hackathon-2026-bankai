# Data ingestion and processing

Pipeline offline en Python 3.12 para Dispute Transaction Support. No expone
endpoints ni participa en peticiones de usuario. La decisión normativa de stack, etapas y publicación vive en
`../docs/adr/0020-ingestion-kdd-and-graph-pipeline.md`.

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

El [módulo `venv` de Python](https://docs.python.org/3/library/venv.html)
documenta este aislamiento. `bankai-pipeline` acepta estas etapas: `transfer`,
`load`, `prepare`, `kdd`, `train-naive-bayes`, `compile-graph`, `publish` y
`all`; siempre requiere `--run-id`.

| Objetivo | Comando | Estado y efecto |
| --- | --- | --- |
| Validar contrato de CLI | `bankai-pipeline --stage prepare --run-id local-dry-run --dry-run` | Disponible; no debe tocar fuentes externas. |
| Ejecutar una etapa | `bankai-pipeline --stage <etapa> --run-id <id>` | Reservado: requiere implementación de etapa, autorización y credenciales. |
| Ejecutar ciclo completo | `bankai-pipeline --stage all --run-id <id>` | Reservado: puede transferir/publicar datos y disparar artefactos. |
| Pruebas | `python -m pytest` | Ejecutable cuando existan pruebas; actualmente el directorio define su ubicación. |

Para KDD, copia `config/kdd.toml.example` a una ruta segura y ejecuta primero:

```bash
bankai-pipeline --stage kdd --run-id kdd-local-20261003 --kdd-config /ruta/kdd.toml --dry-run
```

La implementación compara Apriori y FP-Growth sobre transacciones y reclamos
por separado. Su propuesta, límites y artefactos se documentan en
`docs/kdd-dispute-transaction-support.md`; no compila ni publica un grafo.

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
