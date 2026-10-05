# Modelo operativo CRISP-DM y KDD

## Propósito

CRISP-DM guía el producto completo; KDD es la fase offline que descubre
asociaciones y baselines exploratorios. Ninguno habilita una decisión bancaria,
un join heurístico ni una acción online.

| CRISP-DM | Etapa Bankai | Entrada | Salida controlada | Owner |
| --- | --- | --- | --- | --- |
| Business understanding | Dispute Transaction Support | problema y tareas P0 | KPI, alcance y no-alcance | producto / backend |
| Data understanding | contratos y perfil | metadatos BigQuery autorizados | perfil agregado y brechas | pipeline |
| Data preparation | `prepare` | objeto `verified/` + ledger **o** snapshot canónico autorizado (`--canonical-prepare` desde `hackathon`) | proyección `raw/canonical → stg → aux → cur`, reglas e indicadores de imputación | pipeline |
| Modeling | KDD y C1–C5 | poblaciones curadas (`cur`) y contratos | reglas, baselines, métricas y lineage agregado | pipeline |
| Evaluation | suite y goldens | artefactos versionados | reporte saneado, bloqueos y comparación baseline | backend / pipeline |
| Deployment | publicación y runtime | artefacto validado | `graph-vN`, manifiesto y catálogo cerrado | pipeline / backend |

## Contrato entre etapas

Cada etapa tiene un `run_id` opaco. El lineage conserva sistema origen, hash de
objeto, generación, versión de schema, watermark, conteos, transformaciones y
hash de contenido. No conserva rutas privadas, filas, IDs de cliente, texto
libre, transcripciones, prompts ni evidencia individual.

La preparación usa reglas reproducibles: conserva el registro más reciente por
clave, imputa numéricos con mediana de grupo/global y categóricos con moda de
grupo/`UNKNOWN`, crea `*_was_imputed`, y rechaza valores ausentes en clave o
freshness. Las fechas, targets y claves no se imputan.

## Límites de despliegue

El contrato local no crea vistas ni tablas por sí solo. La ruta ADR 0020
(`verified/` + `ingestion_ledger`) sigue siendo la ingestión normativa hacia
`raw`. Mientras `raw` esté incompleto, el modo explícito
`--canonical-prepare` autoriza materializar `stg`/`aux`/`cur` desde el dataset
analítico aprobado `hackathon` (source_system=`bigquery_canonical`). Ese modo
no reemplaza transfer/load ni debe usarse para escribir tablas `raw`.

```bash
bankai-pipeline --stage prepare --run-id prepare-local-canonical --dry-run --canonical-prepare
bankai-pipeline --stage prepare --run-id prepare-YYYYMMDD-canonical --canonical-prepare
```

Sin `--canonical-prepare`, `bankai-pipeline --stage prepare --dry-run` sólo
describe el plan local de reglas sin alcanzar BigQuery.
