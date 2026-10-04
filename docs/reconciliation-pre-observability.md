# Reconciliación pre-observability

## Base y orden de integración

`reconciliation-pre-observability` parte de `origin/main` en `92aa50f`.
Integra `frontend-integration` y `model-armor` mediante merges con historial
preservado. `structured-rag` se rebasó desde su ancestro desactualizado
`e289495` sobre esa base y se fusionó después; `alexandra` no se integra por
separado porque es ancestro de Structured RAG.

La resolución no usa el orden de llegada como criterio. Se conserva la
implementación más completa sólo si mantiene aislamiento de tenant,
autorización derivada de sesión, minimización, evidencia trazable y fallo
cerrado. Cuando una variante usa menos clases, se conserva únicamente si no
elimina una frontera normativa.

## Resultado técnico

| Área | Implementación conservada | Decisión de reconciliación |
| --- | --- | --- |
| Demo y realtime | Contratos OpenAPI/AsyncAPI, WebSocket, adjuntos y snapshots saneados | La demo usa memoria y un runner determinista; no activa proveedores ni fuentes reales. |
| Structured RAG | Catálogo versionado, SQL `SELECT` validado, parámetros Zod, límites y `EvidenceDTO` | Sustituye la variante previa de `QueryPlan`; el modelo nunca recibe SQL ni elige tenant, tabla o cliente. |
| Model Armor | `GuardrailProvider` con ADC, endpoint regional y fallo cerrado | Se conserva como adaptador real; su activación requiere configuración completa. |
| Estado durable | Adaptador Firestore para conversaciones y configuración Firebase con reglas cerradas | La composición productiva sigue opt-in; el navegador no accede directamente a Firestore. |
| KG-RAG | Catálogo y gate de orden existentes | Permanece cerrado hasta recibir catálogo firmado y artefacto publicado. |
| Ingesta | CLI `bankai-pipeline` y KDD/compilador offline existentes | Se descarta el bootstrap directo S3→GCS→BigQuery y cualquier `WRITE_TRUNCATE`. |

## Matriz ADR

| ADR | Materialización en esta rama | Activación o límite |
| --- | --- | --- |
| 0004 | `rag-state-graph.ts` conserva rutas `llm`, `database`, `relations` y `ood`, con catálogo antes de JEV especializado | ReAct no está activo. |
| 0009 | `query-catalog`, loader, binder, executor y dry-run | Sólo catálogo cerrado y parámetros inyectados. |
| 0010 / 0016 | Model Armor y guardrails de entrada, contenido recuperado, salida y respuesta final | Fallo, resultado parcial o plantilla inválida bloquean. |
| 0011 | `StructuredRag`, catálogos y `EvidenceDTO` | KG-RAG no se invoca sin catálogo y artefacto verificados. |
| 0017 | Firestore para snapshots saneados; Valkey sigue siendo la frontera efímera | El checkpointer productivo requiere composición posterior con credenciales e IAM. |
| 0020 | Pipeline Python independiente y documentación de contrato administrado | Sin Storage Transfer, Eventarc, Cloud Tasks, funciones ni publicación desplegados. |
| 0022 | OpenAPI, AsyncAPI, conversación revisionada, adjuntos y alertas HITL demo | El modo productivo no degrada a demo ni a acceso libre. |

## Pendientes explícitos

La infraestructura no se desplegó ni se llamó durante esta reconciliación. La
activación productiva requiere una composición que valide en el arranque:
Firestore, Valkey, identidad autenticada, catálogo Structured RAG, BigQuery,
JEV, Vertex, Model Armor y GCS. Firestore será el resolver de vínculo
usuario-cliente preferido; el fallback provisional BigQuery debe ser una
consulta cerrada, versionada y parametrizada por `tenantId` y `userId` de la
sesión. Ningún valor de navegador, prompt o modelo puede completar ese vínculo.

La ingesta futura usa Storage Transfer Service hacia GCS/raw, Eventarc,
validación/copia inmutable a `verified/`, Cloud Tasks OIDC y un
`ingestion_ledger` idempotente antes de cargar BigQuery y disparar el job
offline. Esta rama documenta y preserva ese contrato, pero no crea recursos
cloud ni habilita acceso directo a S3.
