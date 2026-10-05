# Runbook: refresh MLOps del knowledge graph

Operación batch del grafo analítico Bankai. No mina por fila ni actualiza el
grafo durante una petición de usuario. Decisión normativa: ADR 0020.

## Principio

1. Nuevo lote → GCS raw → BigQuery raw incremental.
2. Job `pipeline-refresh` con `run-id` nuevo: prepare → KDD ventana completa →
   compile-graph → `graph-diff` → publish (lease + `current.json`).
3. Backend carga sólo `current`; si `run_id` cambia, sirve la nueva versión y
   purga snapshots cacheados antiguos.

## Trigger post-load

Tras carga raw confirmada, `ingestion-worker` encola `pipeline-refresh`. El
orquestador arranca el Cloud Run Job; el job adquiere lease Firestore
(`pipeline_leases/{tenant_id}`) antes de publicar. Sin lease válido no se
actualiza `current.json`.

## Recompute (batch)

```bash
# Desde data-ingestion-and-processing/
bankai-pipeline --stage kdd --run-id <RUN> --kdd-config configs/kdd.toml
bankai-pipeline --stage compile-graph --run-id <RUN> \
  --kdd-artifact-dir artifacts/kdd/<RUN> \
  --graph-output-dir artifacts/graph
```

Cada KDD escribe `population-support-snapshot.json` (soporte por ítem,
`row_count`, ventana) sólo para comparación. El consenso Apriori ∩ FP-Growth ∩
Eclat sigue siendo el único ingreso a `compile-graph`. C1–C5 son ontología fija,
no semillas de minería.

## Diff y gate

```bash
bankai-pipeline --stage graph-diff --run-id <RUN> \
  --previous-kdd-artifact-dir artifacts/kdd/<PREV> \
  --candidate-kdd-artifact-dir artifacts/kdd/<RUN> \
  --diff-output artifacts/diff/<RUN>/graph-diff.json
```

El reporte incluye Jaccard de reglas consenso, altas/bajas, deltas de métricas,
delta de `row_count` y holdout si existe `validation/`. Umbrales configurables
vía flags (`--min-jaccard`, `--max-row-count-delta-ratio`, etc.).

## Promote / rollback

Promote (publicación):

```bash
bankai-pipeline --stage publish --run-id <RUN> \
  --graph-artifact-dir artifacts/graph/<RUN> \
  --publish-backend local --local-target artifacts/kg-published \
  --require-diff-pass --diff-report artifacts/diff/<RUN>/graph-diff.json
```

Con `--require-diff-pass`, si el gate falla el publish aborta sin tocar
`current.json` (fail-closed). GCS exige `--gcs-bucket`, ADC y lease; no ejecutar
sin autorización explícita.

Rollback operativo: republicar o promover un `run_id` inmutable previo
(CLI o `POST /v1/admin/kg/rollback` con rol `backoffice`). No reescribe el
paquete; sólo mueve el pointer.

Admin (contrato OpenAPI, sin UI):

- `GET /v1/admin/kg/current`
- `GET /v1/admin/kg/versions`
- `GET /v1/admin/kg/diff?from=&to=`
- `POST /v1/admin/kg/promote` / `POST /v1/admin/kg/rollback`

## Anti-patrones

| Anti-patrón | Por qué no |
| --- | --- |
| Minería online en HTTP | Soportes globales; latencia/coste; no hay lease |
| Update del grafo por TID | Un TID cambia supports de toda la ventana |
| Promover sin gate con `--require-diff-pass` | Fallo cerrado obligatorio |
| Tratar C1–C5 como reglas minadas | Ontología fija; consenso es la única entrada |
| Usar support snapshot como verdad online | Sólo observabilidad/diff |

## Checklist operador

- [ ] Raw load OK y watermark actualizado
- [ ] KDD + compile con `run-id` nuevo
- [ ] `graph-diff` vs previous con gate pass
- [ ] Publish con lease (GCS) o local demo
- [ ] Backend refleja nuevo `current.run_id` (cache purged)
- [ ] Si gate fail: dejar previous current; investigar churn/holdout
