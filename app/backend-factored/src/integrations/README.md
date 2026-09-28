# integrations

Adaptadores de infraestructura reemplazables por implementaciones reales.

Capas disponibles por defecto:

- `database.ts`: placeholder local y punto de conexion para Postgres via Prisma.
- `bucket.ts`: placeholder local y punto de conexion para S3/GCS/MinIO u otro
  bucket.
- `cache.ts`: cache local o facade sobre una implementación KV inyectada.
- `kv/key-value-store.ts`: contrato neutral de coordinación y factory de
  conexión para Valkey o Redis.
- `kv/resp-key-value-store.ts`: adaptador RESP inicial basado en `node-redis`.
- `kv/kv-session-store.ts`: sesiones server-side con hash, TTL y rotación.
- `kv/kv-private-data-broker.ts`: handles opacos con binding de sesión y
  cifrado AES-GCM.
- `memory/`: stores volátiles de workflow, aprobación, idempotencia y auditoría
  para pruebas; no son persistencia de producción.
- `tools/`: registry estático allowlisted.
- `providers/`: adaptadores de proveedor; el adaptador no disponible falla
  cerrado.

Los placeholders no abren conexiones externas. Estas capas son opcionales: si
`DATABASE_ENABLED`, `BUCKET_ENABLED` o `CACHE_ENABLED` estan en `false`, la capa
se reporta como `disabled` y no cuenta para readiness. Al activar un proveedor
real, usa Prisma Client para TypeScript/Postgres, inyectalo desde
`src/http/server.ts` o desde el composition root del servicio y conserva
credenciales en settings/entorno.

El cliente KV no se conecta durante import-time. El composition root debe usar
la factory, conectar, inyectar los adaptadores y cerrarlo durante el shutdown.
Valkey es el proveedor predeterminado y Redis permanece intercambiable; ambos
usan el adaptador RESP inicial. El servidor debe estar detrás de red privada,
TLS y ACL de mínimo privilegio.

Los puertos viven en `src/services/ports`, no en esta carpeta. PostgreSQL,
Qdrant, Model Armor, modelos y OpenTelemetry se incorporarán como adaptadores de
esos puertos sin cambiar los casos de uso.
