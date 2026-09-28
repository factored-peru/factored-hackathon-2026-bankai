# ADR 0017: KV para sesión y PostgreSQL para workflows durables

## Status

Accepted

## Context

La sesión de usuario necesita baja latencia, TTL, revocación y soporte para
varias instancias detrás de un balanceador. Los handles de datos privados son
efímeros y deben invalidarse con la sesión. En cambio, los checkpoints de
LangGraph, las aprobaciones HITL y la auditoría deben sobrevivir a expiraciones
de sesión, reinicios y despliegues.

Valkey y Redis proporcionan las primitivas necesarias mediante RESP. Acoplar el
dominio o los casos de uso a un cliente concreto impediría cambiar de proveedor
o adoptar otro driver sin modificar la frontera de sesión.

El repositorio aún no incorpora el runtime de LangGraph ni Prisma, por lo que
los adaptadores durables deben quedar como puertos hasta implementar esas
dependencias.

## Decision

- `KeyValueStore` es el puerto interno de coordinación para sesión y handles.
- Valkey es el proveedor predeterminado para desarrollo y despliegues nuevos;
  Redis continúa soportado mediante `KV_PROVIDER=redis`.
- El adaptador inicial usa `node-redis` como cliente RESP para ambos
  proveedores. `KeyValueStoreFactory` permite sustituirlo por GLIDE u otro
  driver sin cambiar dominio, servicios o HTTP.
- `KvSessionStore` y `KvPrivateDataBroker` dependen únicamente de
  `KeyValueStore`; los tipos y comandos del driver no salen del adaptador RESP.
- PostgreSQL será el backend durable para checkpoints, workflows, aprobaciones y
  auditoría cuando se incorpore LangGraph.
- La cookie solo contiene un ID opaco CSPRNG; no se firma ni contiene estado.
- Las sesiones usan hashes con TTL deslizante.
- Los handles usan claves derivadas del hash de sesión y del hash del handle,
  TTL independiente y payload cifrado con AES-256-GCM.
- Todos los handles privados del MVP son single-use y se obtienen y eliminan
  con la operación atómica `GETDEL`.
- Revocar o rotar una sesión elimina la sesión anterior. Los handles antiguos
  quedan inutilizables porque su sesión o `sessionVersion` ya no es válida.
- El servidor KV se conecta mediante TLS, ACL de mínimo privilegio y red
  privada. Nunca se expone directamente al navegador o a un proveedor de IA.

## Invariantes

- `sessionId`, cookies y handles completos no aparecen en logs ni cruzan el
  boundary del LLM, Jev, RAG o Model Armor.
- Cada tool call vuelve a validar sesión, tenant, audiencia, propósito,
  permisos y versión de sesión.
- El resolver recarga la sesión desde la capa KV justo antes de usar el handle;
  no confía en una copia del contexto conservada por el grafo.
- El fallo del almacén KV bloquea sesiones y tool calls; no hay fallback
  permisivo.
- `threadId` y `workflowId` no son credenciales.
- La reanudación de un workflow exige sesión válida y autorización actual.
- El estado persistido del workflow contiene referencias o proyecciones mínimas,
  nunca credenciales ni secretos.

## Consequences

### Positivas

- La sesión se puede compartir entre réplicas sin sticky sessions.
- Valkey y Redis son intercambiables sin filtrar dependencias al dominio.
- TTL y revocación son operaciones naturales del almacén KV.
- La persistencia crítica no depende de que la sesión siga viva.
- El broker impide que el modelo conozca valores privados antes de ejecutar la
  herramienta.

### Costos y límites

- Se necesita operar el proveedor KV con TLS, ACL, backups y monitorización.
- La selección del proveedor no valida por sí sola la identidad del servidor;
  despliegue y observabilidad deben comprobar el backend configurado.
- `GETDEL` requiere una versión compatible con consumo atómico.
- Los checkpoints y datos de workflow requieren una integración PostgreSQL
  posterior.
- El cifrado de handles requiere rotación de
  `PRIVATE_DATA_ENCRYPTION_KEY`, que debe documentarse antes de producción.

## Referencias

- [Valkey: migración y compatibilidad RESP](https://valkey.io/topics/migration/)
- [Valkey: clientes compatibles](https://valkey.io/clients/)
- [Valkey: GETDEL](https://valkey.io/commands/getdel/)
- [Redis session store](https://redis.io/docs/latest/develop/use-cases/session-store/)
- [node-redis guide](https://redis.io/docs/latest/develop/clients/nodejs/)
- [LangGraph persistence](https://docs.langchain.com/oss/javascript/langgraph/persistence)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
