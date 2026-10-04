# Validación local de KG-RAG: C1–C5

## Propósito y alcance

Este registro documenta la ejecución reproducible del KDD, la compilación y
la publicación local del grafo que alimenta el adaptador KG-RAG. Describe
asociaciones agregadas y baselines exploratorios; no representa transacciones,
reclamos ni predicciones de un cliente.

El único destino local admitido es el tenant `demo-bankai`. El paquete vive
bajo una ruta ignorada por Git, y no se publicó en GCS ni se conectó al chat
productivo.

## Artefacto validado

| Campo | Resultado |
| --- | --- |
| Ejecución KDD | `kdd-20261004-kg` |
| Grafo | `graph-20261004-kg` |
| Esquema | `bankai-kdd-graph-v1` |
| Nodos / aristas | 639 / 2,024 |
| Reglas corroboradas | 500, presentes en Apriori y FP-Growth con las mismas métricas |
| SHA-256 de `graph-v1.msgpack` | `3f6b3b19d7b818d25bea916c4d231f8c36edf6f30d3a3a3b0b6845ede8f75f9d` |
| Catálogo local | `kg-v1-3f6b3b19d7b818d2` |
| Tenant permitido | `demo-bankai` |

El manifiesto conserva el `run_id`, la versión del catálogo de casos, hashes
de artefactos de KDD y provenance agregado de la suite supervisada. No contiene
filas, IDs de cliente, texto libre, transcripciones ni evidencia individual.

## Casos expuestos

| Caso | Target exploratorio | Resultado y límite |
| --- | --- | --- |
| C1 | `sla_breached` | El piloto no supera la prevalencia; no hay umbral ni priorización aprobada. |
| C2 | `resolution_days` | El baseline global fue mejor que la cohorte; describe capacidad, no fecha prometida. |
| C3 | `is_fraud` | El `fraud_score` existente supera el baseline; no abre una investigación automática. |
| C4 | `requires_followup` / `was_escalated` | Sin recall operativo al umbral informativo; no usar texto ni transcripciones. |
| C5 | `main_score` | Sin evidencia para recuperación automática de servicio. |

Las preguntas golden de C1–C5 usan exclusivamente `kg.case.summary`. Piden el
alcance, target y limitación del caso, y validan que el selector escoja un
`case_id` permitido sólo después de cargar el catálogo. No piden reglas para
una persona, una operación o un reclamo específico.

## Resultado de pruebas

La validación de la implementación verificó:

- Pipeline Python: 24 pruebas unitarias aprobadas, incluidas compilación del
  grafo, integración C1–C5, publicación local, checksums, esquema, idempotencia
  y rechazo de tenant ajeno.
- Backend Bun: 216 pruebas aprobadas, 987 assertions en 35 archivos, incluidos
  lectura de artefactos, checksum, catálogo ausente, schema inválido, tenant
  ajeno y operaciones no permitidas.
- Contratos y calidad: `bun run spec:check`, `bun run check-types`, `bun run
  check` y `git diff --check` aprobados.

La suite de evaluación agrega cinco goldens sintéticos, uno por C1–C5. Sus
metadatos verifican catálogo antes de JEV, ruta KG cerrada, selección coincidente
y evidencia requerida. El texto de las preguntas se mantiene únicamente como
entrada de prueba: no entra en `EvaluationContext`, resultados, telemetría ni
artefactos.

## Límites pendientes

- La publicación real en GCS, el puntero productivo y su lease Firestore siguen
  siendo trabajo separado de ADR 0020.
- KG-RAG no está conectado al `ConversationRunner` ni al chat demo.
- C6–C8 siguen bloqueados: no existe una relación canónica reclamo-operación,
  evidencia de comercio validada o reconciliación de rail de pagos.
- Las reglas son asociaciones exploratorias, no causalidad, autorización,
  diagnóstico individual o automatización.

## Referencias

- [Catálogo de casos priorizados](prioritized-dispute-case-catalog.md)
- [KDD de Dispute Transaction Support](kdd-dispute-transaction-support.md)
- [Goldens de preguntas KG C1–C5](../../app/backend/tests/fixtures/kg-question-goldens.ts)
- [ADR 0011](../../docs/adr/0011-rag-trust-tenant-isolation.md)
- [ADR 0015](../../docs/adr/0015-agent-evaluation-release-gates.md)
- [ADR 0020](../../docs/adr/0020-ingestion-kdd-and-graph-pipeline.md)
