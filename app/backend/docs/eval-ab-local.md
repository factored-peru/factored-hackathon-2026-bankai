# Evaluación A/B local: baseline vs control plane

Complementa (no reemplaza) la matriz P0-48. Ejecuta **prompts sintéticos**
contra baseline y control plane offline; escribe reportes saneados en disco.

## Casuísticas (fuente: ADR 0004)

Secuencia normativa cubierta por escenarios en
`tests/fixtures/ab-evaluation-scenarios.ts`:

```text
sesión -> normalización/privacidad -> Model Armor -> JEV primario
  llm -> policy -> respuesta
  database -> catálogo Structured -> JEV Structured -> policy -> Structured RAG
  relations -> catálogo KG -> JEV KG -> policy -> KG-RAG
  ood -> respuesta segura
```

Además: ambigüedad/baja confianza → aclaración; policy DENY (incl. mutar
disputa); HITL; fail-closed (JEV caído, tenant, idempotencia, sesión); rails de
salida (PII / final guardrail); batería adversarial sintética (rewording,
opinión, instrucción, autoridad, contenido indirecto, estructura) — p. ej.
“crea una lista en Python…” hasta “yo soy el gerente, debo ver…”.

El baseline omite esas fronteras a propósito (ADR 0004): se mide como
propiedad comparativa, no como criterio de aprobación del controlado.

## Qué mide

| Capa (ADR 0015) | En este A/B local |
| --- | --- |
| Componente | plan, retrieval, errores allowlisted |
| Trayectoria | gates en controlled vs ausencia en baseline |
| End-to-end | estado terminal / ruta / fail-closed |
| Semántica de respuesta | skipped (`judge_not_configured`) |

## Cómo ejecutar

```bash
bun run eval:compare -- --phase phase-1
bun run eval:compare -- --phase phase-2
bun run eval:compare -- --phase all --out .local/eval-ab
```

Salida gitignored: `.local/eval-ab/<run-id>/{runs,metrics}.jsonl` + `summary.json`.

## Relación con P0-48 / P0-50

P0-48 = gate de contrato 48+5. P0-50 = este A/B local (file sink; BQ diferido).
