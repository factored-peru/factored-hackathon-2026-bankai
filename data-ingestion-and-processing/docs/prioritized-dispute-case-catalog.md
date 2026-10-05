# Catálogo priorizado de casos predictivos: Dispute Transaction Support

## Propósito y límite

Este catálogo convierte la agenda de preguntas de
[`revision-consultas-latam.md`](../referencias/revision-consultas-latam.md)
en iteraciones analíticas comprobables sobre el inventario real de
`factored-hackathon.hackathon`. No implementa un servicio, un modelo en línea
ni un grafo. Tampoco autoriza decisiones financieras, rechazo de reclamos o
clasificación de una persona como fraudulenta.

Se adopta la separación conceptual del módulo de referencia FuTour:

- una predicción probabilística responde una variable objetivo explícita;
- Apriori, FP-Growth y Eclat describen asociaciones, no causalidad ni probabilidad de
  un caso individual;
- un grafo futuro solo materializará entidades normalizadas, reglas
  versionadas, métricas y procedencia publicadas por el pipeline.

El orden de implementación es `C={C1,C2,C3,C4,C5,C6,C7,C8}`. La prioridad no
convierte un caso en permitido: los casos bloqueados no pasan a desarrollo
hasta que se satisfagan sus brechas de datos y la ADR correspondiente.

## Evidencia de factibilidad

La inspección agregada del 3 de octubre de 2026 confirmó estas condiciones:

| Hecho observado | Consecuencia |
| --- | --- |
| `transactions` tiene 4,425,008 filas y `complaints` 67,095. | Hay población suficiente para perfiles y baselines por tabla. |
| Hay 13,580 reclamos de categoría `Transactions`; 12,297 son `Cargo no reconocido`. | Es el primer dominio de disputa a analizar. |
| 9,447 reclamos transaccionales están `Open` o `In Process`; 1,931 de ellos incumplen SLA. | C1 tiene impacto operacional concreto. |
| `complaints.origin_interaction_id` es nulo en los reclamos transaccionales. | No existe enlace probado reclamo → interacción/transcripción. |
| 11,752 reclamos transaccionales tienen historial previo de transacciones por `customer_id`, y 10,652 historial previo de contacto. | El cliente compartido permite cohortes históricas, pero no identifica la operación reclamada ni prueba causalidad. |
| `call_center_interactions` tiene 240,056 interacciones `Transaccional`. | C4 puede estudiarse como población de atención independiente. |

No se incorporan IDs, nombres, documentos, teléfonos, direcciones, texto de
reclamo, transcripciones, IP, sesiones ni coordenadas como predictores de esta
primera lista. Las consultas y artefactos deben seguir las fronteras de PII y
provenance vigentes.

## Casos priorizados y separados

### Construibles con el dato actual

| Caso | Preguntas a responder | Tablas y relación permitida | Predictores disponibles en el instante de decisión | Variable predicha | Método inicial y límite |
| --- | --- | --- | --- | --- | --- |
| **C1 — Riesgo de incumplimiento de SLA** | ¿Qué nuevo reclamo transaccional puede incumplir SLA? ¿Qué atributos justifican priorizarlo para revisión humana? | `complaints`; una fila por `complaint_id`. Restringir inicialmente a `category = Transactions`. | `case_type`, `category`, `subcategory`, `reception_channel`, `priority`, `claimed_amount`, `currency`, `is_repeat_complainer` y componentes de `creation_date` disponibles al alta. | `sla_breached` (binaria). | **Piloto KDD ejecutado:** PR-AUC 0.211 frente a prevalencia 0.217; no hay umbral ni integración. Excluir `status`, asignación, respuesta, resolución, compensación y cualquier fecha posterior: son leakage. |
| **C2 — Duración esperada de resolución** | ¿Qué casos requerirán más tiempo? ¿Qué cola necesita capacidad o seguimiento temprano? | `complaints`; entrenar únicamente con casos terminales y medir por cohortes temporales. | Los de C1; opcionalmente `assigned_agent_id` solo para una predicción *post-asignación*, separada y sin exponer el identificador en artefactos. | `resolution_days` (regresión) y bucket operacional derivado. | **Piloto KDD ejecutado:** la cohorte tuvo MAE 7.472, pero el baseline global fue mejor (7.422); se conserva el global para planificación. Excluir `resolution_date`, `closing_date`, `resolution`, compensación, satisfacción y `status` como predictor. |
| **C3 — Señal de fraude para investigación** | ¿Qué operación requiere revisión adicional? ¿Qué atributos explican la señal sin concluir responsabilidad? | `transactions`; una fila por `transaction_id`. No se presenta como resultado de una disputa. | `transaction_type`, `transaction_category`, `amount`, `currency`, `channel`, `merchant_category`, `transaction_status`, `response_code` y componentes de `transaction_date`. | `is_fraud` (binaria). | **Piloto ejecutado:** Naive Bayes ponderado PR-AUC 0.000957; `fraud_score` calibrado 0.699446 en población comparable. Se conserva el score existente como referencia; no abre investigación automáticamente. |

### Construibles como poblaciones independientes, no como una disputa individual

| Caso | Preguntas a responder | Tablas y relación permitida | Predictores disponibles en el instante de decisión | Variable predicha | Método inicial y límite |
| --- | --- | --- | --- | --- | --- |
| **C4 — Riesgo de escalamiento o seguimiento de atención transaccional** | ¿Qué contacto transaccional probablemente requerirá seguimiento o escalamiento? ¿Qué información debe preparar el operador? | `call_center_interactions`; filtrar `reason_category = Transaccional`. No unirlo a un reclamo salvo vínculo canónico futuro. | Antes o durante la interacción: `interaction_type`, `channel` y atributos temporales de `interaction_date`. | `requires_followup` y `was_escalated` (experimentos independientes). | **Piloto ejecutado:** PR-AUC 0.239391 y 0.098534, respectivamente; sin recall al umbral 0.5. No usar texto/transcripción ni automatizar seguimiento. |
| **C5 — Riesgo de baja satisfacción posterior** | ¿Qué interacción requiere recuperación de servicio antes de perder satisfacción? | `call_center_interactions` ↔ `satisfaction_surveys` mediante `interaction_id` exacto; restringir a la población con encuesta. | Predictores pre-interacción de C4. | `main_score` ordinal 1–7. | **Piloto ejecutado:** MAE 1.270024 y kappa cuadrático 0.0; no hay evidencia para recuperación automática. No usar comentarios ni respuestas de encuesta como inputs. |

### Bloqueados por datos o evidencia no disponibles

| Caso | Preguntas a responder | Objetivo que se necesitaría | Bloqueo verificable |
| --- | --- | --- | --- |
| **C6 — Reconstrucción de disputa contra operación** | ¿Existe el cargo reclamado? ¿Cuál fue su estado, monto y evidencia? | Resultado final de disputa y/o una categoría de resolución normalizada. | Falta relación autorizada y auditable `complaint_id → transaction_id`; el cliente compartido y la cercanía temporal no son sustitutos. |
| **C7 — Reconocimiento de comercio y first-party fraud** | ¿El cliente reconoce la marca/compra? ¿La disputa terminó en reconocimiento, fraude confirmado o error? | Resultado de disputa validado, retiro/cancelación y taxonomía de resolución. | Faltan enriquecimiento merchant–marca–orden, evidencia de comercio y ground truth de resultado. No etiquetar first-party fraud por recurrencia o score. |
| **C8 — ATM, duplicados y transferencia no acreditada** | ¿El ATM dispensó? ¿Son dos cargos o dos etapas? ¿El receptor fue acreditado? | Estado reconciliado por evento de pago. | Faltan journal ATM, `auth/clearing/reference_id`, ledger de saldo, estado de rail y acuse del receptor. `transaction_status` por sí solo no prueba estos hechos. |

## Reglas de iteración y evaluación

1. Cada `Ci` se entrena, evalúa y publica como población independiente. No se
   construye un join heurístico para suplir C6.
2. Definir antes de ejecutar cada experimento el instante de predicción, la
   variable objetivo, columnas permitidas, exclusiones por leakage y corte
   temporal de train/validación/test.
3. Comparar cualquier modelo con un baseline simple por cohortes y con métricas
   adecuadas: PR-AUC, recall y calibración para C1/C3/C4; MAE y cuantiles para
   C2; métricas ordinales o de clasificación para C5. Reportar cobertura,
   prevalencia y errores por segmento permitido, sin PII cruda.
4. Apriori/FP-Growth pueden proponer hipótesis con soporte, confianza y lift;
   nunca sustituyen el target supervisado ni se transforman en causalidad.
5. Los artefactos deben contener hashes, versión de contrato, ventana temporal,
   población, métricas y exclusiones. No deben contener filas, texto, IDs de
   cliente ni transcripciones.

## Pautas que exigen ADR antes de desarrollo

La implementación de un caso no se autoriza solo por este catálogo. Requiere
crear o actualizar ADR y propagar la decisión a tareas y contratos cuando se
quiera:

- aprobar el objetivo, el instante de decisión, la definición de positivo y
  los controles de leakage de C1–C5;
- crear la relación canónica reclamo–transacción de C6, o permitir cualquier
  matching temporal por cliente;
- usar `description`, `resolution`, transcripciones, IP, geolocalización,
  merchant enrichment, datos de producto o atributos del cliente;
- seleccionar umbrales, calibración, explicación, human-in-the-loop y acción
  permitida para una señal predictiva;
- compilar, publicar o servir un grafo o catálogo KG-RAG.

Estas decisiones deben ser coherentes con ADR 0009 (consultas estructuradas
cerradas), ADR 0011 (Structured RAG y KG-RAG), ADR 0015 (evaluación y gates),
ADR 0016 (PII), ADR 0018 (ejecución segura) y ADR 0020 (pipeline y publicación
de artefactos). Un grafo futuro no podrá contener PII, texto crudo ni una
asociación presentada como hecho o causalidad.

## Referencias

- [`revision-consultas-latam.md`](../referencias/revision-consultas-latam.md)
- [`kdd-dispute-transaction-support.md`](kdd-dispute-transaction-support.md)
- [`futour-knowledge-graph-lessons.md`](futour-knowledge-graph-lessons.md) y
  la [referencia FuTour vendorizada](../referencias/futour-knowledge-graph/README.md)
- [`ADR 0009`](../../docs/adr/0009-sql-customer-data-access.md),
  [`ADR 0011`](../../docs/adr/0011-rag-trust-tenant-isolation.md),
  [`ADR 0015`](../../docs/adr/0015-agent-evaluation-release-gates.md),
  [`ADR 0016`](../../docs/adr/0016-pii-detection-and-deidentification.md),
  [`ADR 0018`](../../docs/adr/0018-agent-execution-boundaries-and-evaluation.md)
  y [`ADR 0020`](../../docs/adr/0020-ingestion-kdd-and-graph-pipeline.md).
