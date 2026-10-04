# ADR 0022: Conversación en tiempo real y demo integrada al frontend

## Status

Accepted

## Context

El frontend Next.js necesita una interfaz de chat con estado visible, historial
recuperable y alertas HITL, sin convertir el navegador en autoridad de tenant,
identidad, SQL o datos bancarios. Cloud Run puede reconectar una sesión WebSocket
en otra instancia, por lo que memoria local no es una fuente de verdad.

## Decision

El backend expone HTTP para inicio/snapshot/cargas y WebSocket autenticado para
eventos de conversación. El contrato HTTP vive en OpenAPI y los envelopes del
socket en AsyncAPI. Cada evento contiene hilo, revisión y trace ID; el cliente
reconecta y rehidrata el snapshot antes de continuar.

Firestore guarda únicamente snapshots, checkpoints, HITL y trazabilidad
saneados. Valkey conserva sesión, mapeos demo efímeros, idempotencia y fan-out.
GCS recibe adjuntos privados por URL firmada; no se envían binarios por socket ni
se entregan a modelos en esta etapa. La sesión demo devuelve aliases, nunca
`customer_id`; el backend mantiene el vínculo a BigQuery y usa consultas
cerradas. Backoffice demo puede revisar el tenant demo y recibe alertas HITL.

`DEMO_AUTH_ENABLED` sólo se permite fuera de producción. Firebase Auth mantiene
el camino de producción. Structured RAG permanece cerrado hasta que exista un
catálogo aprobado; el chat demo no lo sustituye.

## Consequences

Toda conexión WebSocket valida cookie, origen allowlisted y la sesión vigente.
Los clientes deben implementar reconexión. Las instancias no dependen de memoria
local para recuperar conversación o alertas. La generación incremental se limita
a contenido ya saneado; una futura generación que requiera redacción usa modo
buffered conforme ADR 0016.
