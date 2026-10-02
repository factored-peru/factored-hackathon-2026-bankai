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
- `OTEL_*`: telemetría sin contenido privado y métricas de evaluadores TypeScript.

LangSmith, DeepEval, Promptfoo y DeepAgents no son dependencias ni destinos de
telemetría P0: `../../docs/planning/evals.md` establece OTel + BigQuery y
evaluadores TypeScript/JEV como la ruta vigente. Los flags de integración permanecen desactivados hasta que su adaptador,
contrato, pruebas y políticas de región/retención estén implementados. Firestore
es durable; Valkey solo mantiene estado con TTL.
