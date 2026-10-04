# Product brief — Dispute Transaction Support

Documento de producto para P0-03. No sustituye los ADR; define el contrato de
demo y los outcomes revisables antes de conectar datos o proveedores reales.

## Cliente y usuarios

| Rol | Quién | Uso |
| --- | --- | --- |
| Cliente (organización) | Banco | Dueño del workflow; reduce tiempo y costo de resolución de incidentes de tarjeta. |
| Usuario cliente | Titular / usuario autenticado de banca | Consulta evidencia autorizada de transacción y disputa; solicita escalamiento mock cuando el agente no puede cerrar solo. |
| Usuario operador | Backoffice / agente humano | Revisa casos, aprueba o rechaza escalamientos simulados; no ejecuta movimientos bancarios reales desde esta superficie. |

Roles de sesión canónicos (ADR 0006): `client` y `operator`. La demo puede
etiquetar superficies como `customer` / `backoffice`; el backend las trata como
alias de esos roles.

## Workflow elegido

**Dispute Transaction Support** es el único workflow P0. El sistema asiste la
triage y resolución asistida de problemas de transacción/disputa (rechazo,
fraude sospechado, reversa, operación pendiente y escalamiento), no un chatbot
general de tarjetas.

Justificación frente a otros workflows del reto: hay señal operacional en
transacciones y reclamos para acotar el problema; el alcance general de soporte
de tarjetas carece de etiquetas suficientes para un agente amplio (ver
`research/analisis-viabilidad-kg-dispute-transaction-support.md`).

## Outcomes

| Ámbito | Outcome |
| --- | --- |
| Servicio | El cliente obtiene evidencia autorizada, aclaración o escalamiento HITL sin fuga de datos ni acciones bancarias no simuladas. |
| Negocio | Reducir el tiempo de resolución del incidente de disputa/transacción respecto al proceso manual, manteniendo supervisión humana en decisiones de riesgo. |

## KPI principal

- **Métrica**: tiempo de resolución del incidente.
- **Definición**: tiempo transcurrido desde la apertura del caso/disputa hasta
  un estado terminal (`closed` / denegado con cierre / escalamiento verificado
  mock según política), medido en horas o días según el snapshot de evaluación.
- **Población**: mismos filtros y exclusiones que el baseline manual (P0-05) y
  el conjunto de evaluación del agente.
- **Baseline**: snapshot BigQuery 2026-10-04 sobre
  `complaints.category = Transactions`, terminales Resolved/Closed:
  mean ≈ 15.4 días, **p50 = 15**, **p90 = 27**, sla_breach_rate ≈ 0.19
  (ver `data-ingestion-and-processing/docs/phase1-problem-baseline-20261004.md`).
- **Objetivo de agente**: mejorar completitud y duración frente a ese baseline
  sin degradar aislamiento de tenant ni introducir leaks.

## Alcance y no-alcance (resumen)

**En alcance (simulado o de solo lectura autorizada)**

- Autenticación y sesión (demo o Firebase según composición).
- Lectura de evidencia sintética o BigQuery vía catálogo cerrado.
- Escalamiento mock con aprobación de operador (`effect: none`).
- Aclaración, abstención OOD y fallo cerrado.

**Fuera de alcance / DENY**

- Presentar, cancelar o modificar una disputa bancaria real.
- Movimientos de fondos, bloqueo/desbloqueo de tarjeta con efecto real.
- SQL libre, vector-RAG, o fallback factual a LLM sin evidencia.

La matriz versionada ALLOW / DENY / REQUIRE_APPROVAL vive en
[`dispute-capability-matrix-v1.md`](dispute-capability-matrix-v1.md) y en el
módulo Zod del backend.

## Trade-offs

| Dimensión | Decisión P0 |
| --- | --- |
| Autonomía | Baja–media: lecturas ALLOW; escalamiento REQUIRE_APPROVAL; acciones bancarias DENY. |
| Precisión | Prioridad sobre autonomía: catálogos cerrados, policy y guardrails antes de responder. |
| Latencia | Aceptable retrasar respuesta ante fallo de Model Armor, JEV o catálogo; no hay bypass. |
| Costo | Proveedores (Vertex, JEV, Model Armor) opt-in; CI de PR sin proveedores; JEV real manual/nocturno. |
| HITL | Obligatorio para escalamiento; el operador decide sobre hechos y evidencia ya saneados. |

## Referencias

- ADR 0004 (control plane), 0006 (Auth/RBAC), 0018 (límites de simulación),
  0022 (demo/realtime).
- Plan operativo: [`../task-delivery-phases-p0.md`](../task-delivery-phases-p0.md).
