# Validación local de KG-RAG: run endurecido 2026-10-04

## Propósito y alcance

Registra la regeneración del KDD/grafo tras aplicar filtros anti-leakage,
MultiLevel y scope Transactions (papers/FuTour). Describe asociaciones
agregadas y baselines exploratorios C1–C5; no representa transacciones,
reclamos ni predicciones de un cliente.

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

## Artefacto validado

| Campo | Resultado |
| --- | --- |
| Ejecución KDD | `kdd-20261004-hardened` |
| Grafo | `graph-20261004-hardened` |
| Esquema | `bankai-kdd-graph-v1` |
| Nodos / aristas | 553 / 1,787 |
| Reglas corroboradas | 435 (Apriori ∩ FP-Growth, métricas idénticas) |
| SHA-256 de `graph-v1.msgpack` | `d4b128bc0ab01b9d7446954b903d4d2c0bfbd51f222102f16c4c7d82d4be3aab` |
| Catálogo local | `kg-v1-d4b128bc0ab01b9d` |
| Tenant permitido | `demo-bankai` |
| Publicación local | `app/backend/.local/kg-rag/demo-bankai/graph-20261004-hardened` |

Comparado con el run previo `graph-20261004-kg` (639 nodos / 2,024 aristas /
500 reglas): el grafo endurecido es más pequeño porque elimina leakage
post-outcome, tautologías jerárquicas y relleno; no porque se haya perdido
cobertura de C1–C5 (siguen como provenance exploratorio).

## Filtros aplicados al KDD

| Filtro | Efecto |
| --- | --- |
| `category = 'Transactions'` en complaints | Scope Dispute Transaction Support |
| Excluir `resolution_days*`, `sla_breached` si target=`status` | Anti-leakage de outcome |
| Drop `category`+`subcategory` en el mismo antecedente | MultiLevel (Han et al.) |
| Dedup superconjunto con mismas métricas | Menos reglas redundantes |
| Sin `claimed_amount_sign=NON_NEGATIVE` | Menos ítems relleno |

## Casos expuestos

| Caso | Target exploratorio | Resultado y límite |
| --- | --- | --- |
| C1 | `sla_breached` | El piloto no supera la prevalencia; no hay umbral ni priorización aprobada. |
| C2 | `resolution_days` | Baseline global de capacidad (p50≈15d / p90≈27d); no promete fecha. |
| C3 | `is_fraud` | El `fraud_score` existente supera el baseline; no abre investigación automática. |
| C4 | `requires_followup` / `was_escalated` | Sin recall operativo al umbral informativo. |
| C5 | `main_score` | Sin evidencia para recuperación automática de servicio. |

C6–C8 siguen bloqueados (sin join canónico reclamo–operación / comercio / rail).

## Resultado de pruebas

- Pipeline Python: `pytest` 33 pruebas aprobadas (incluye filtros KDD endurecidos).
- Backend Bun: suite previa + lectura local del artefacto publicado bajo
  `.local/kg-rag` (sin secretos en Git).

## Límites pendientes

- Publicación GCS + lease Firestore (ADR 0020).
- KG-RAG no está cableado al `ConversationRunner` productivo.
- Asociaciones de complaints hacia `status` son débiles sin leakage; no se
  reintroducen features post-outcome para “mejorar” métricas.
- Las reglas no son causalidad, autorización ni diagnóstico individual.

## Referencias

- [Catálogo de casos priorizados](prioritized-dispute-case-catalog.md)
- [KDD de Dispute Transaction Support](kdd-dispute-transaction-support.md)
- [Lecciones FuTour](futour-knowledge-graph-lessons.md)
- [Goldens KG C1–C5](../../app/backend/tests/fixtures/kg-question-goldens.ts)
- [ADR 0011](../../docs/adr/0011-rag-trust-tenant-isolation.md)
- [ADR 0015](../../docs/adr/0015-agent-evaluation-release-gates.md)
- [ADR 0020](../../docs/adr/0020-ingestion-kdd-and-graph-pipeline.md)
