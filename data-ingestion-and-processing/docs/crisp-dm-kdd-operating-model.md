# Modelo operativo CRISP-DM y KDD

## Propósito

CRISP-DM guía el producto completo; KDD es la fase offline que descubre
asociaciones y baselines exploratorios. Ninguno habilita una decisión bancaria,
un join heurístico ni una acción online.

| CRISP-DM | Etapa Bankai | Entrada | Salida controlada | Owner |
| --- | --- | --- | --- | --- |
| Business understanding | Dispute Transaction Support | problema y tareas P0 | KPI, alcance y no-alcance | producto / backend |
| Data understanding | contratos y perfil | metadatos BigQuery autorizados | perfil agregado y brechas | pipeline |
| Data preparation | `prepare` | objeto `verified/` y ledger | proyección `raw → stg → aux → cur`, reglas e indicadores de imputación | pipeline |
| Modeling | KDD y C1–C5 | poblaciones curadas y contratos | reglas, baselines, métricas y lineage agregado | pipeline |
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

El contrato local no crea vistas ni tablas. La ejecución productiva de
`prepare` sólo se habilitará después de que ADR 0020 tenga worker de ingesta,
objeto inmutable `verified/` e `ingestion_ledger` confirmado. Hasta entonces,
`bankai-pipeline --stage prepare --dry-run` permite revisar la proyección y las
reglas sin alcanzar servicios cloud.
