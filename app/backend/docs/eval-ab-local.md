# Evaluación A/B local: baseline vs control plane

Complementa (no reemplaza) la matriz P0-48. Ejecuta **prompts sintéticos**
contra baseline y control plane offline; escribe reportes saneados en disco.

## Corpus

| Métrica | Valor |
| --- | --- |
| Total prompts | **128** |
| Locales | **64 `es` / 64 `pt`** (pares espejo) |
| answerable (datos) | 56 — Structured allowlist + KG C1–C5 + llm informativo |
| clarify | 16 |
| escalate_hitl | 32 — H14/H2/ATM/scam/freeze/folio/etc. |
| ood / deny / rails | 24 |

## Polaridad y locales

| `polarity` | Significado |
| --- | --- |
| `positive` | Intento legítimo: catálogo Structured/KG, llm, ood, clarify, hitl de asistencia |
| `negative` | Abuso, deny, adversarial, rails fail-closed, veredicto fraude / secretos / mutar disputa |

| `locale` | Uso |
| --- | --- |
| `es` / `pt` | Habla coloquial Latam en el **user prompt** |
| (sistema) | Instructions del juez JEV / entry-chooser / baseline **siempre en inglés** |

Fuente VOC: `data-ingestion-and-processing/referencias/revision-consultas-latam.md`.
Solo se mapean a `database_ok` / `rag_ok` planes y casos **consultables**:
Structured `customer_products` | `product_status` | `recent_transactions`; KG C1–C5.
ATM / PIX / veredicto fraude (C6–C8) → negativas (HITL/deny/guardrail), no catálogo.

## Casuísticas (fuente: ADR 0004)

```text
sesión -> normalización/privacidad -> Model Armor -> JEV primario
  llm -> policy -> respuesta
  database -> catálogo Structured -> JEV Structured -> policy -> Structured RAG
  relations -> catálogo KG -> JEV KG -> policy -> KG-RAG
  ood -> respuesta segura
```

## Qué mide

| Capa (ADR 0015) | En este A/B local |
| --- | --- |
| Componente | plan, retrieval, errores allowlisted |
| Trayectoria | gates en controlled vs ausencia en baseline |
| End-to-end | estado terminal / ruta / fail-closed |
| Semántica | JEV-as-judge (`integrations` `createTrajectoryJevAsJudge`) si `JEV_ENABLED` |

Al proveedor JEV solo van etiquetas `workflow_A` / `workflow_B`.

### Cómo leer `summary.json`

- Técnico: `technicalPassCount` / `technicalFailCount`
- Semántico global: `semantic.workflow_A|B`
- Por polaridad: `semantic.byPolarity.positive|negative` (mismos campos + deltas)

```bash
bun run eval:compare -- --phase all --judge auto
bun run eval:compare -- --phase all --judge jev
bun run eval:compare -- --phase all --judge synthetic
```

Scores `informational`. Exit code solo por fallos técnicos del controlado.

## Relación con P0-48 / P0-50

P0-48 = gate de contrato 48+5. P0-50 = este A/B local (file sink; BQ diferido).
