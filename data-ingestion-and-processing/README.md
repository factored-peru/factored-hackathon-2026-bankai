# Data ingestion and processing

Pipeline offline en Python 3.12. No expone endpoints ni participa en peticiones
de usuario. La decisión normativa de stack, etapas y publicación vive en
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

El cierre automatizado descrito en ADR 0020 invocará el job desde GCP, no desde
una estación local. Como referencia de operación controlada, un job ya creado
se ejecuta con `gcloud run jobs execute <JOB> --region <REGION> --wait`; requiere
el rol de invocación y no debe usarse para crear infraestructura. Consulta la
[documentación oficial de Cloud Run Jobs](https://cloud.google.com/run/docs/execute/jobs).
