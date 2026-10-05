# Evaluación A/B local: baseline vs control plane

Complementa (no reemplaza) la matriz determinista P0-48 de 48 core + 5
extensiones KG C1–C5. Esta batería ejecuta **prompts sintéticos realistas**
contra ambos pipelines offline y escribe reportes saneados en disco.

## Qué mide

| Capa (ADR 0015) | En este A/B local |
| --- | --- |
| Componente | binding de plan, retrieval contado, errores allowlisted |
| Trayectoria | controlled invoca control/privacy/guardrail/policy; baseline documenta ausencia de gates |
| End-to-end | estado terminal, ruta, retrieval esperado, fail-closed |
| Semántica de respuesta | **skipped** (`judge_not_configured`) |

No compara calidad de prosa ni “mejor respuesta”. No usa BigQuery persist ni
Langfuse. No activa `AGENTIC_CHAT_ENABLED` en HTTP/Cloud Run.

## Cómo ejecutar

Desde `app/backend/`:

```bash
bun run eval:compare -- --phase phase-1
bun run eval:compare -- --phase phase-2
bun run eval:compare -- --phase all --out .local/eval-ab
```

Salida (gitignored): `.local/eval-ab/<run-id>/{runs,metrics}.jsonl` + `summary.json`.
La consola imprime sólo el summary saneado (sin prompts).

## Escenarios

Definidos en `tests/fixtures/ab-evaluation-scenarios.ts`:

- **phase-1:** `customer_products`, `product_status`, `recent_transactions`
- **phase-2:** preguntas C1–C5 del catálogo de disputa + OOD, deny, HITL, injection

Misma `snapshotId` lógica sintética para el par A/B de cada escenario.

## Relación con P0-48

P0-48 permanece el gate de contrato informational de EvaluationContext.
Esta capacidad es una **tarea A/B nueva** (file sink; persist BQ diferido).
