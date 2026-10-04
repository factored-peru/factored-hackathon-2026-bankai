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

## Artefacto validado (población completa)

| Campo | Resultado |
| --- | --- |
| Ejecución KDD | `kdd-20261004-fullpop` |
| Grafo | `graph-20261004-fullpop` |
| Filas transactions / complaints | 4,425,008 / 13,580 |
| Jaccard triple | 1.0 (406 + 24 reglas minadas; 430 en grafo tras filtros) |
| Nodos / aristas | 543 / 1,763 |
| SHA-256 de `graph-v1.msgpack` | `a062458599b417913aec0d92957f87a18f4b31567eb6387844832eb7b0cf9370` |
| Catálogo local | `kg-v1-a062458599b41791` |
| Publicación local | `app/backend/.local/kg-rag/demo-bankai/graph-20261004-fullpop` |

Backend Apriori en población grande: vertical TID (equivalente a Hybrid);
FP-Growth y Eclat se ejecutan completos. Descarga BQ vía Storage API.

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
- Publicación local `demo-bankai` actualizada al grafo multi-algoritmo.

## Límites pendientes

- Publicación GCS + lease Firestore (ADR 0020).
- KG-RAG no está cableado al `ConversationRunner` productivo.
- K2 / redes bayesianas estructurales siguen fuera del grafo asociativo.
- Las reglas no son causalidad, autorización ni diagnóstico individual.

## Referencias

- [Catálogo de casos priorizados](prioritized-dispute-case-catalog.md)
- [ADR 0020](../../docs/adr/0020-ingestion-kdd-and-graph-pipeline.md)
- [KDD Dispute Transaction Support](kdd-dispute-transaction-support.md)
