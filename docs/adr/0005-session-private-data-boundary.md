# ADR 0005: Sesión server-side y frontera de datos privados

## Status

Accepted

## Context

La identidad, los datos privados y los handles de herramientas no deben cruzar
hacia modelos ni proveedores externos.

## Decision

SessionManager vive en el backend Bun/TypeScript. La cookie `__Host-session`
solo contiene un identificador opaco; el backend verifica el ID token de
Firebase y aplica rotación, revocación, `sessionVersion`, CSRF, tenant, rol y
capability.

Memorystore for Valkey mantiene sesión, handles cifrados AES-GCM, locks,
idempotencia y rate limiting con TTL. Firestore conserva casos, checkpoints,
aprobaciones HITL y auditoría saneada. Ningún dato efímero se usa como fuente
durable.

El LLM, JEV, Model Armor, BigQuery y GCS reciben solo una proyección mínima y
validada. Las herramientas resuelven handles exclusivamente server-side y
devuelven `EvidenceDTO` saneado.

## Consequences

La revocación y la expiración quedan aisladas del workflow durable. Un fallo de
Valkey no habilita fallback a estado privado en el cliente ni en un proveedor.
