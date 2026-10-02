# AGENTS

- Lee `README.md`, incluida la **Guía de invocación**, antes de instalar o
  ejecutar el pipeline. Usa el CLI `bankai-pipeline` y sus etapas declaradas;
  no crees scripts paralelos para invocarlo.
- Usa únicamente Python 3.12 para transferencia, procesamiento, KDD, Naive
  Bayes y compilación del grafo.
- Cada transformación debe conservar lineage, reglas de calidad, indicadores de
  imputación y una versión de artefacto reproducible.
- No publiques PII ni datos crudos en logs, reportes o artefactos de grafo.
- No implementes APIs online ni sesiones en esta capa.
- La primera ejecución debe ser `--dry-run`. Cualquier ejecución que alcance
  S3, GCS, BigQuery, Cloud Tasks o Cloud Run requiere autorización explícita,
  identidad GCP/AWS válida y un `run-id` opaco sin PII.
- Conserva `.venv`, credenciales, manifiestos operativos y artefactos generados
  fuera de Git; no imprimas su contenido en logs o documentación.
