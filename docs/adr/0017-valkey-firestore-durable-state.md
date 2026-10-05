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

Identidad durable de aplicación: `customer_identity_bindings` (user →
`customer_id`) y `user_profiles` (roles/capabilities). Las sesiones siguen
siendo sólo Valkey; el backend puede mantener un LRU de proceso delante de
`SessionStore.get` / resolvers, sin sustituir el almacén compartido.

### Namespaces Memorystore (mismo cluster por defecto)

Prefijo configurable `KV_KEY_PREFIX` (default `agent:`):

| Namespace | Uso | TTL |
| --- | --- | --- |
| `{prefix}session:…` | Sesión opaca | `SESSION_TTL_SECONDS` |
| `{prefix}handle:…` | Handles AES-GCM de datos privados | `HANDLE_TTL_SECONDS` |
| `{prefix}llm:resp:v1:…` | Exact-match de respuesta LLM saneada | `LLM_CACHE_TTL_SECONDS` |
| `{prefix}idem:…` / `{prefix}lock:…` | Coordinación futura | corto |

El cache LLM (`LLM_CACHE_ENABLED`) reutiliza el mismo Memorystore. La clave
incluye `tenantId` + `userId` (hash), `modelId`, `operation`, `promptHash`,
`graphRunId` y `catalogVersion` para invalidar al publicar grafo/catálogo nuevo
sin `FLUSHDB`. Valores: JSON `{ text, model, usage?, createdAt }` — nunca
system prompt crudo, user raw, filas BigQuery, msgpack del grafo, evidencia
intermedia ni checkpoints LangGraph (siguen en Firestore).

Anti-patrones: cache semántico por embeddings en Valkey; sustituir el LRU de
proceso de sesión/identidad por este cache; segundo cluster Memorystore salvo
presión de memoria o SLA/trust distinto (`*-llm-cache` con `allkeys-lru`).

Capa distinta del **provider prompt cache** (Vertex/Gemini): el adaptador ordena
prefijo estable (`systemInstruction` + tools + marcador catalog/graph) antes de
la cola variable del usuario para aprovechar caching implícito del proveedor.
