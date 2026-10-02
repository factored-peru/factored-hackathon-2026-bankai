# ADR 0007: Ejecución durable y human-in-the-loop

## Status

Accepted

## Context

Las acciones de riesgo y las decisiones operativas deben sobrevivir reinicios y
requerir una transición explícita de un operador autorizado.

## Decision

LangGraph.js pausa el workflow antes del efecto y guarda checkpoint, caso y
propuesta en Firestore. La aprobación del operador usa versión, actor, rol,
timestamp e idempotency key; la reanudación valida que la propuesta aprobada
coincida exactamente con la operación solicitada.

Valkey solo guarda coordinación y estado de sesión temporal. Un timeout,
revocación, conflicto de versión o aprobación inválida termina o devuelve el
workflow a aclaración, sin ejecutar el efecto.

## Consequences

La auditoría durable es independiente de la conexión del navegador y de la
vida útil de una sesión.
