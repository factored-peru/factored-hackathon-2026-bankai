# ADR 0018: Fronteras de ejecución, durabilidad y simulación

## Status

Accepted

## Evolución

El orden del `StateGraph` pertenece a ADR 0004 y los criterios de evaluación a
ADR 0015. Esta ADR conserva la decisión que le corresponde: cómo los fallos y
simulaciones preservan límites de ejecución y durabilidad.

## Context

Los fallos de sesión, guardrail, clasificación, recuperación o herramienta no
pueden producir estados ambiguos ni una respuesta con datos no autorizados.

## Decision

El workflow LangGraph.js usa el orden definido por ADR 0004. Los estados
durables y pausas HITL se guardan en Firestore; SessionManager y los handles
viven con TTL en Valkey. La recuperación solo puede producir `EvidenceDTO`
desde BigQuery o GCS mediante los catálogos cerrados de ADR 0009 y ADR 0011.

Las simulaciones TypeScript cubren estado terminal, aclaración, rechazo,
escalamiento, pérdida de sesión, versión de grafo inválida, checksum incorrecto,
fallo de proveedor y respuesta bloqueada por privacidad. Toda salida de prueba
se minimiza antes de persistirla.

## Consequences

No existe continuidad implícita ante errores ni acceso a Qdrant, PostgreSQL o
Redis. La recuperación y las simulaciones siguen siendo auditables por versión.
