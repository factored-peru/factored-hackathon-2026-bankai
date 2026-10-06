# Evaluación A/B local: baseline vs control plane

Complementa (no reemplaza) la matriz P0-48. Ejecuta **prompts sintéticos**
contra baseline y control plane offline; escribe reportes saneados en disco
bajo `.local/eval-ab/` (sin BigQuery, sin Langfuse, sin flag HTTP agentic).

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

Al proveedor JEV solo van etiquetas `workflow_A` / `workflow_B`. El juez puntúa
**trayectorias saneadas** (ruta, status, gates, toolOutcome, flags de
retrieval), no el texto de la respuesta.

## Baseline LLM

### Modos (`--baseline`)

| Modo | Comportamiento |
| --- | --- |
| `auto` (default) | Vertex si `VERTEX_AI_ENABLED=true` y project/location/model válidos; si no, double |
| `vertex` | Obliga Vertex; falla con `vertex_baseline_misconfigured` si falta config |
| `synthetic` | Double scripted (rápido; ignora el system prompt del modelo) |

### Prompt y tool

- System prompt: `BASELINE_SYSTEM_PROMPT` en
  `src/services/baseline/bankai-table-declaration.ts`.
  Framing: asistente bancario de Dispute Transaction Support; responde en el
  **mismo idioma** del usuario (es/pt); usa `retrieve_context` con QueryPlans
  listados; disclaimer de que **no** es el control plane gobernado.
- Tool A/B: allowlist sintética
  `customer_products` | `product_status` | `recent_transactions` (filas
  sintéticas; no ejecuta BigQuery en este compare).
- Ruta registrada del baseline: siempre `llm` (sin router del control plane).
- Wiring: `BaselineComparableRunner({ model, modelId })` desde
  `scripts/eval-compare.ts` vía `createBaselineChatModelFromEnv`.

El double scripted sigue siendo el default de **unit tests** (determinista, sin
red). No usar sus scores semánticos para decidir calidad de prompt.

### Cómo leer `summary.json`

- Técnico: `technicalPassCount` / `technicalFailCount`
- Semántico global: `semantic.workflow_A|B` (A = baseline, B = controlled)
- Por polaridad: `semantic.byPolarity.positive|negative`
- `baselineMode`: `vertex` | `synthetic` (campo del stdout del script)
- Exit code **1** sólo si el **controlado** tiene fallos técnicos; fails del
  baseline (p. ej. retrieval no intentado / query plan distinto) bajan métricas
  informativas pero no fallan el gate del script.

```bash
bun run eval:compare -- --phase all --judge auto --baseline auto
bun run eval:compare -- --phase all --judge jev --baseline vertex
bun run eval:compare -- --phase all --judge synthetic --baseline synthetic
```

Scores `informational`. Ver también ADR 0015.

## Informe de referencia: baseline real vs control plane (2026-10-06)

Comparación canónica del A/B: **workflow_A** = baseline Vertex live
(`gemini-2.5-flash` + `BASELINE_SYSTEM_PROMPT`) vs **workflow_B** = control
plane. Corpus 128, `--phase all --judge auto --baseline auto`.

Run ID: `ab-20261006-563a7029`.

### Resumen

| Métrica | Baseline (A) | Control plane (B) |
| --- | ---: | ---: |
| passRate semántico | **84.4%** | **100%** |
| avgScore | 0.84 | 0.99 |
| passCount / failCount | 108 / 20 | 128 / 0 |
| technicalFail | 18* | **0** |

| Comparación de pares | Valor |
| --- | ---: |
| B > A | 20 |
| A > B | 0 |
| Empates | 108 |
| Δ promedio (B − A) | +0.15 |

\*Solo baseline: 8 `baseline_retrieval_missing` + 10
`baseline_query_plan_mismatch`. Exit del script = 0 (gate sólo mira
controlado).

### Por polaridad

| Polaridad | N | A passRate | B passRate | B > A | Empates | Δ (B−A) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| positive | 96 | 80.2% | 100% | 19 | 77 | +0.19 |
| negative | 32 | 96.9% | 100% | 1 | 31 | +0.03 |

**Lectura:** el control plane gana o empata en todos los pares. La brecha
semántica es pequeña (+0.15); en negativos casi empatan. Donde B supera a A
suele ser porque el baseline no intentó retrieval o eligió otro QueryPlan.

> El double scripted (`--baseline synthetic`) no forma parte de este informe:
> no aplica el system prompt y no mide calidad del baseline real.

Artefactos locales (gitignored): `.local/eval-ab/<runId>/summary.json`.

## Relación con P0-48 / P0-50

P0-48 = gate de contrato 48+5. P0-50 = este A/B local (file sink; BQ diferido).
