# Validación local de KG-RAG: run multi-algoritmo 2026-10-04

## Propósito y alcance

Registra la regeneración del KDD/grafo con consenso
Apriori ∩ FP-Growth ∩ Eclat, AprioriHybrid como paridad, filtro Han MultiLevel
y los endurecimientos anti-leakage previos. Describe asociaciones agregadas;
no representa transacciones, reclamos ni predicciones de un cliente.

El único destino local admitido es el tenant `demo-bankai`. El paquete vive
bajo una ruta ignorada por Git; no se publicó en GCS ni se conectó al chat
productivo.

## Lectura ordenada

1. [CRISP-DM / KDD operating model](crisp-dm-kdd-operating-model.md)
2. [Baseline Fase 1](phase1-problem-baseline-20261004.md)
3. [KDD Dispute Transaction Support](kdd-dispute-transaction-support.md)
4. [Lecciones FuTour / papers](futour-knowledge-graph-lessons.md)
5. Este documento (artefacto KG)
6. [Catálogo de casos C1–C8](prioritized-dispute-case-catalog.md)

## Artefacto validado (población completa + suite Ci)

| Campo | Resultado |
| --- | --- |
| Ejecución KDD | `kdd-20261004-fullpop` |
| Grafo | `graph-20261004-fullpop-ci` |
| Filas transactions / complaints | 4,425,008 / 13,580 |
| Jaccard triple | 1.0 (406 + 24 reglas minadas; 430 en grafo tras filtros) |
| Nodos / aristas | 548 / 1,768 (incluye 5 `ModelRun` C1–C5) |
| Suite supervisada | `supervised-suite-20261003` adjuntada |
| SHA-256 de `graph-v1.msgpack` | `61b18366c6b7ba60573e8d3afd4d532ff06d5a3456593d0783701393bdcf4c6b` |
| Catálogo local | `kg-v1-61b18366c6b7ba60` |
| Publicación local | `app/backend/.local/kg-rag/demo-bankai/graph-20261004-fullpop-ci` |

Backend Apriori en población grande: vertical TID (equivalente a Hybrid);
FP-Growth y Eclat se ejecutan completos. Descarga BQ vía Storage API.

### Validación por conjuntos (KDD) y gap Ci

- KDD con `[kdd.validation]` (default): holdout temporal sobre la población
  completa de la ventana (sin subsample); mina en train y recalcula
  support/confidence/lift en holdout. `n_folds > 1` añade Jaccard entre bloques
  temporales. Artefactos: `validation/*-holdout-metrics.json`.
- El run `kdd-20261004-fullpop` documentado abajo **precede** a esa etapa; al
  re-ejecutar KDD con la config actual se materializa la validación por
  conjuntos automáticamente.
- **No hay StratifiedKFold** en C1–C5: usan holdout temporal
  train/calibration/test sobre pilotos muestreados.
- C1 aplica muestreo **estratificado por clase** (`_stratified_quotas`); C3
  `stratified_weighted`. Eso no es CV estratificado por folds.

### Scorecard Ci vs grafo (`kg-ci-scorecard.ts`)

| Ci | Status grafo | ModelRun | Evidencia asociativa auxiliar | Veredicto |
| --- | --- | --- | --- | --- |
| C1 | exploratory_not_promoted | `c1-pilot-20261003` | complaints + 24 reglas `IN_PROCESS` (KDD no predice `sla_breached`) | Piloto PR-AUC 0.211 ≈ prevalencia 0.217; sin umbral |
| C2 | exploratory_not_promoted | `c2-pilot-20261003` | mismas reglas intake `IN_PROCESS` (sin `resolution_days`) | Baseline global mejor que cohorte; sin promesa de fecha |
| C3 | exploratory_not_promoted | `c3-pilot-20261003` | 8 reglas `DECLINED`; `is_fraud=TRUE` sin reglas en grafo | NB débil vs `fraud_score` 0.699; grafo habla de rechazo, no fraude |
| C4 | exploratory_not_promoted | `c4-pilot-20261003` | sin población KDD de call center | Fuera del grafo asociativo; recall@0.5 = 0 |
| C5 | exploratory_not_promoted | `c5-pilot-20261003` | sin población KDD de call center | MAE 1.27 / kappa 0; sin recuperación automática |
| C6 | blocked | — | — | Falta join canónico reclamo↔transacción |
| C7 | blocked | — | — | Falta evidencia merchant/outcome |
| C8 | blocked | — | — | Falta reconciliación de rail/ATM |

`bun run eval:run` (gate informational): 433/460 checks; goldens KG
`kg-case-c1`…`c5` **pasan** (10/10 cada uno). Los 27 fails restantes son
fixtures negativos / otras rutas (p.ej. `catalog-missing`), no fallos de Ci.

## Inferencia de ejemplo (pregunta → grafo)

Pregunta: *¿Qué condiciones del grafo elevan la probabilidad de que una
transacción quede DECLINED, y qué casos de disputa aplican?*

Plan cerrado ejecutado: `kg.population.summary` → `kg.rules.by-target`
(`transaction_status=DECLINED`) → populations/rules de complaints →
`kg.case.summary` (C1). Script operador: `app/backend/tmp/kg-question-infer.ts`.

Hallazgos (artefacto fullpop):

| Evidencia | Resultado |
| --- | --- |
| Reglas DECLINED | 8 corroboradas; top lift ≈ 12.54 |
| Top asociación | `response_code=51 → transaction_status=DECLINED` (conf ≈ 0.63) |
| Variante | `is_fraud=FALSE ∧ response_code=51 → DECLINED` (lift ≈ 12.54) |
| Complaints IN_PROCESS | 24 reglas; lifts modestos (~1.11–1.13), intake-only |
| Caso C1 | `exploratory_not_promoted` (sin umbral operativo) |

Interpretación: el grafo sí responde la pregunta con asociaciones
poblacionales consensuadas; no autoriza rechazo individual ni causalidad.

## Artefacto validado (muestra multi-algoritmo previa)

| Campo | Resultado |
| --- | --- |
| Ejecución KDD | `kdd-20261004-multialgo` |
| Grafo | `graph-20261004-multialgo` |
| Esquema | `bankai-kdd-graph-v1` |
| Nodos / aristas | 539 / 1,748 |
| Reglas corroboradas | 426 (Apriori ∩ FP-Growth ∩ Eclat) |
| SHA-256 de `graph-v1.msgpack` | `95d4757e9fa5a8c71f5f3e0cbe3272a96bea6300ce2258f319715925d958636d` |
| Catálogo local | `kg-v1-95d4757e9fa5a8c7` |
| Tenant permitido | `demo-bankai` |
| Publicación local | `app/backend/.local/kg-rag/demo-bankai/graph-20261004-multialgo` |

Comparado con `graph-20261004-hardened` (553 nodos / 1,787 aristas / 435
reglas duales): el recorte (−9 reglas) proviene del filtro Han de
descendientes taxonómicos en complaints, no de divergencia entre mineros
(Jaccard triple = 1.0).

## Filtros y mineros aplicados

| Filtro / miner | Efecto |
| --- | --- |
| `category = 'Transactions'` en complaints | Scope Dispute Transaction Support |
| Excluir `resolution_days*`, `sla_breached` si target=`status` | Anti-leakage |
| Drop `category`+`subcategory` co-antecedente | MultiLevel tautología |
| Han ε=0.05 ancestro→descendiente | −9 reglas complaints vs hardened |
| Consenso Apriori ∩ FP-Growth ∩ Eclat | Grafo |
| AprioriHybrid | Paridad itemsets con Apriori; no vota |
| fpmax | Solo diagnóstico; no alimenta el grafo |

## Casos expuestos

| Caso | Target exploratorio | Resultado y límite |
| --- | --- | --- |
| C1 | `sla_breached` | El piloto no supera la prevalencia; no hay umbral ni priorización aprobada. |
| C2 | `resolution_days` | Baseline global de capacidad; no promete fecha. |
| C3 | `is_fraud` | El `fraud_score` existente supera el baseline. |
| C4 | `requires_followup` / `was_escalated` | Sin recall operativo al umbral informativo. |
| C5 | `main_score` | Sin evidencia para recuperación automática. |

C6–C8 siguen bloqueados (sin join canónico reclamo–operación / comercio / rail).
No se cruza complaints↔transactions en KDD.

## Resultado de pruebas

- Pipeline Python: `pytest` KDD/grafo/publicación aprobados con contrato
  tripartito.
- Publicación local `demo-bankai` actualizada a `graph-20261004-fullpop-ci`
  (KDD fullpop + ModelRuns C1–C5).
- Scorecard operador: `bun tmp/kg-ci-scorecard.ts`.
- `bun run eval:run`: goldens KG C1–C5 pasan; gate informational 433/460.
- Informe de interpretabilidad: `bankai-pipeline --stage report-metrics`
  → `artifacts/reports/metrics-20261004-fullpop/` (3 tests unitarios OK).

## Informe de interpretabilidad (`metrics-20261004-fullpop`)

Rollup read-only de KDD fullpop + C1–C5 + suite + grafo. Separación FuTour:
métricas asociativas ≠ posteriors bayesianos ni probabilidades de clasificador.
Sin SHAP; conviction y leverage se derivan de support/confidence/lift.

### Asociación (KDD)

| Población | Reglas | Lift p50 / max | Conf p50 / max | Conviction p50 / max | Leverage p50 / max |
| --- | --- | --- | --- | --- | --- |
| transactions | 406 | 1.087 / 12.543 | 1.0 / 1.0 | 2.534 / 2.548 | 0.0032 / 0.070 |
| complaints | 24 | 1.081 / 1.135 | 0.431 / 0.452 | 1.057 / 1.098 | 0.0013 / 0.0021 |

Top lift transactions: `response_code=51 → transaction_status=DECLINED`
(lift 12.543, conf 0.627, supp 0.012, conv 2.548). Jaccard triple = 1.0.

### Supervisado (pilotos)

| Caso | Señal principal | Lectura |
| --- | --- | --- |
| C1 | PR-AUC 0.211 / Brier 0.171 / recall@0.5 = 0 | ≈ prevalencia 0.217; sin umbral |
| C2 | MAE@p50 7.42 / p50_cov 0.509 / p90_cov 0.944 | Baseline de capacidad |
| C3 | Model PR-AUC 0.001 vs fraud_score 0.699 | NB débil frente al score existente |
| C4 | followup PR-AUC 0.239; escalated 0.099; recall@0.5 = 0 | Sin recall operativo |
| C5 | MAE 1.27 / kappa 0 / macro-F1 0.092 | Sin recuperación automática |

Gaps explícitos del reporte (artefactos fullpop previos a set-validation): sin
artefactos KDD de holdout temporal en ese run; sin StratifiedKFold en C1–C5;
bins de calibración sólo en C1; tablas de error por segmento ausentes en
C1/C3/C4; suite sólo almacena hashes/bloqueos. Re-ejecutar KDD con
`[kdd.validation]` materializa holdout sobre población completa.

## Límites pendientes

- Publicación GCS + lease Firestore (ADR 0020).
- KG-RAG no está cableado al `ConversationRunner` productivo.
- K2 / redes bayesianas estructurales siguen fuera del grafo asociativo.
- Las reglas no son causalidad, autorización ni diagnóstico individual.

## Referencias

- [Catálogo de casos priorizados](prioritized-dispute-case-catalog.md)
- [ADR 0020](../../docs/adr/0020-ingestion-kdd-and-graph-pipeline.md)
- [KDD Dispute Transaction Support](kdd-dispute-transaction-support.md)
