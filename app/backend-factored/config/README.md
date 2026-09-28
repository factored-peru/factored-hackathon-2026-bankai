# config

Configuracion versionable del servicio.

`settings.toml` contiene defaults por entorno que pueden vivir en git. Los secretos deben ir por variables de entorno o `.env`, no en TOML.

Ambientes soportados:

- `dev`
- `staging`
- `prod`

El ambiente se selecciona con `APP_ENV`. El loader aplica primero `[app]` y
luego `[profiles.<APP_ENV>.app]` cuando existe.

Precedencia:

1. Defaults del codigo.
2. `[app]` en `config/settings.toml` o la ruta indicada por `CONFIG_FILE`.
3. `[profiles.<APP_ENV>.app]` en el mismo TOML.
4. Variables de entorno cargadas por Bun, incluyendo `.env`.

Las integraciones externas son opt-in. Mantener `DATABASE_ENABLED`,
`BUCKET_ENABLED` o `CACHE_ENABLED` en `false` significa que esa capa no se
conecta ni cuenta para readiness.

## Variables preparadas para las siguientes APIs

`.env.example` deja declaradas las variables que necesitarán las futuras
integraciones, siempre vacías cuando contienen secretos. Las claves de sesión,
proveedores, Qdrant, PII detector, LangSmith y OTLP son credenciales de
servidor: no se incluyen en TOML, logs, OpenAPI ni prompts.

- `SESSION_*`, `KV_*`, `AUTH_*` y `CSRF_SECRET`: identidad externa y sesión
  server-side. Valkey es el proveedor predeterminado y Redis también está
  soportado; si se habilita la sesión, `KV_URL` es obligatorio.
- `DATABASE_*` y `QDRANT_*`: acceso a datos con tenant/filtros inyectados por
  backend; `QDRANT_API_KEY` debe ser la clave de menor privilegio posible.
- `MODEL_ARMOR_*`, `SDP_*`, `VERTEX_AI_*` y `GOOGLE_*`: Google Cloud. El
  runtime debe usar ADC/IAM mediante una cuenta de servicio o identidad
  adjunta; `GOOGLE_APPLICATION_CREDENTIALS` solo es una ruta local de
  desarrollo y no debe contener JSON dentro de este repositorio.
- `JEV_*`, `OPENAI_*`, `ANTHROPIC_*` y `OPENROUTER_*`: proveedores opcionales,
  cada uno detrás de su adaptador, política de datos y presupuesto.
- `OTEL_*` y `LANGSMITH_*`: telemetría; nunca deben recibir contenido privado,
  cookies, tokens ni handles completos.

La capa KV solo guarda el contexto mínimo de sesión y handles efímeros cifrados. Los
checkpoints durables de workflows y las aprobaciones HITL pertenecen a
PostgreSQL, no al almacén de sesión.

Los flags `*_ENABLED` permanecen en `false` hasta que exista el adaptador,
su prueba de contrato y la política de región/retención correspondiente.
