# Configuración del backend

`settings.toml` contiene defaults versionables. Los secretos van por variables
de entorno, Secret Manager o un `.env` local no versionado.

La precedencia es defaults de código, `[app]`, perfil de `settings.toml` y
variables de entorno. Los perfiles soportados son `dev`, `staging` y `prod`.

## Integraciones objetivo

- `SESSION_*`, `KV_*`, `AUTH_*` y `CSRF_SECRET`: Firebase, SessionManager y
  Memorystore for Valkey. La conexión gestionada usa TLS, IAM y red privada.
- `FIRESTORE_*`, `BIGQUERY_*`, `GCS_*` y `GOOGLE_*`: estado durable,
  Structured RAG, KG-RAG y recursos Google Cloud mediante ADC/IAM.
- `MODEL_ARMOR_*`, `SDP_*`, `VERTEX_AI_*` y `JEV_*`: proveedores del control
  plane, siempre detrás de un adaptador y una política de datos.
  Con `MODEL_ARMOR_ENABLED=true` son obligatorios `MODEL_ARMOR_PROJECT_ID`,
  `MODEL_ARMOR_LOCATION` y `MODEL_ARMOR_INSPECT_TEMPLATE` (id del template o
  nombre completo `projects/.../templates/...`); si falta alguno el arranque
  falla con `SVC-CORE-9006`. El endpoint es regional y debe coincidir con la
  ubicación del template. `MODEL_ARMOR_ENABLED=false` mantiene el guardrail
  fail-closed. `MODEL_ARMOR_DEIDENTIFY_TEMPLATE` y `SDP_*` aún no se usan.
- `OTEL_*`: telemetría sin contenido privado y métricas de evaluadores TypeScript.

LangSmith, DeepEval, Promptfoo y DeepAgents no son dependencias ni destinos de
telemetría P0: `../../docs/planning/evals.md` establece OTel + BigQuery y
evaluadores TypeScript/JEV como la ruta vigente. Los flags de integración permanecen desactivados hasta que su adaptador,
contrato, pruebas y políticas de región/retención estén implementados. Firestore
es durable; Valkey solo mantiene estado con TTL.
