# ADR 0017: Valkey efímero y Firestore durable

## Status

Accepted

## Context

Sesiones y coordinación requieren baja latencia y TTL, mientras que casos,
checkpoints y aprobaciones deben sobrevivir a reinicios y ser auditables.

## Decision

Memorystore for Valkey es el único almacén KV gestionado para sesión,
coordinación, locks, rate limiting, idempotencia y handles efímeros. El backend
usa `node-redis` detrás de puertos de dominio, con TLS, IAM Auth, Private
Service Connect y Direct VPC egress.

Firestore es el almacén durable para casos, checkpoints de LangGraph,
aprobaciones HITL, estado de workflow y auditoría saneada. También conserva el
lease transaccional y el estado de ejecución del pipeline definido en ADR 0020;
ese lease serializa preparación, KDD y publicación de grafo. Las transiciones
críticas se realizan atómicamente y llevan versión/idempotency key.

## Consequences

Valkey no conserva evidencia, casos, aprobaciones, auditoría, checkpoints ni
leases del pipeline. BigQuery conserva la traza analítica de ingesta; Firestore
conserva su coordinación durable. PostgreSQL y Redis no son componentes
soportados del despliegue objetivo.
