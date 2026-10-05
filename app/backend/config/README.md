# Configuración del backend

`settings.toml` contiene defaults versionables. Los secretos van por variables
de entorno, Secret Manager o un `.env` local no versionado.

La precedencia es defaults de código, `[app]`, perfil de `settings.toml` y
variables de entorno. Los perfiles soportados son `dev`, `staging` y `prod`.

## Catálogo de Structured RAG

`structured-catalog.example.json` muestra el formato del catálogo cerrado de
`QueryPlan` (ADR 0009 y 0011). El catálogo real es un JSON versionado con la
misma forma; las entradas del ejemplo solo ilustran el formato y no son una
decisión de negocio.

- El SQL usa los marcadores `{project}` y `{dataset}`, que el cargador resuelve
  desde configuración, así que el mismo archivo sirve para cada entorno.
- Cada entrada declara parámetros `caller` (los valida el backend; todos son
  obligatorios, porque sin `OR` un parámetro opcional no se puede expresar) y
  `session` (los inyecta el backend: `customer_id`, `tenant_id`), columnas con
  su clasificación, roles, `maxRows` y `maximumBytesBilled`.
- Con `BIGQUERY_ENABLED=true` se exigen `GOOGLE_CLOUD_PROJECT`,
  `GOOGLE_CLOUD_LOCATION` (la región del dataset, por ejemplo `us-central1`) y
  `BIGQUERY_DATASET`; el proceso falla al arrancar si falta alguno o si un
  nombre contiene caracteres que no sean letras, números, `_` o `-`
  (`SVC-CORE-9006`). `STRUCTURED_CATALOG_PATH` apunta al JSON real (por defecto
  `config/structured-catalog.json`, relativo al backend) y
  `BIGQUERY_JOB_TIMEOUT_MS` acota cada job (máximo 60 000).
- El selector real reparte dos papeles (ADR 0004): el JEV elige la entrada y
  Vertex AI interpreta sus parámetros. `JEV_ENABLED` exige `JEV_BASE_URL`
  (https), `JEV_API_KEY` y `JEV_MODEL` (`SVC-CORE-9007`); `VERTEX_AI_ENABLED`
  exige `VERTEX_AI_PROJECT_ID`, `VERTEX_AI_LOCATION` y `VERTEX_AI_MODEL`
  (`SVC-CORE-9008`). `JEV_MIN_CONFIDENCE` (0.7 por defecto) es el umbral bajo el
  cual la elección se trata como ambigua; debe validarse con datos reales.
  `JEV_API_KEY` solo entra por entorno o Secret Manager, nunca en TOML ni en Git.
- El cargador rechaza el catálogo completo si una entrada no cumple la forma
  única permitida: un `SELECT` de una tabla del dataset configurado, columnas
  explícitas, `WHERE customer_id = @<param de sesión>` como primera condición,
  sin `OR`, `UNION`, `JOIN`, subconsultas ni comentarios, y con `LIMIT` literal
  menor o igual a `maxRows`. Para ampliar esa forma hay que cambiar el
  validador y sus pruebas, no el catálogo.
- Una entrada sin predicado de `customer_id` se rechaza hoy. Si se necesitan
  datos no ligados a un cliente (sucursales, tipos de cambio), requiere una
  decisión explícita y un cambio en el esquema.

## Integraciones objetivo

- `SESSION_*`, `KV_*`, `AUTH_*` y `CSRF_SECRET`: Firebase, SessionManager y
  Memorystore for Valkey. La conexión gestionada usa TLS, IAM y red privada.
- `FIRESTORE_*`, `BIGQUERY_*`, `GCS_*` y `GOOGLE_*`: estado durable,
  Structured RAG, KG-RAG y recursos Google Cloud mediante ADC/IAM.
- `GCS_GRAPH_BUCKET`, `GCS_GRAPH_TENANT_ID` y `GCS_GRAPH_ARTIFACT_PREFIX`:
  adaptador productivo que lee el mismo paquete inmutable que publica el
  pipeline (`{prefix}{tenant}/current.json` + artefactos versionados). En
  `prod`, un bucket configurado exige `GCS_ENABLED=true` y prohíbe
  `KG_RAG_LOCAL_ENABLED`. El prefijo default es vacío (alineado al CLI
  publish). Terraform inyecta `GCS_GRAPH_BUCKET` desde el bucket
  `kg_artifacts`. El runtime se decora en el servidor para
  `createRagStateGraph` / evals; no cablea automáticamente el chat baseline.
- `KG_RAG_LOCAL_*`: adaptador de desarrollo para el paquete local publicado
  por el pipeline. Requiere `KG_RAG_LOCAL_ENABLED=true`, conserva
  `.local/kg-rag` como ruta por defecto y sólo acepta `demo-bankai`; el
  runtime lo rechaza en `prod`. No habilita GCS ni conecta automáticamente el
  chat demo al control plane.
- `MODEL_ARMOR_*`, `SDP_*`, `VERTEX_AI_*` y `JEV_*`: proveedores del control
  plane, siempre detrás de un adaptador y una política de datos.
  Con `MODEL_ARMOR_ENABLED=true` son obligatorios `MODEL_ARMOR_PROJECT_ID`,
  `MODEL_ARMOR_LOCATION` y `MODEL_ARMOR_INSPECT_TEMPLATE` (id del template o
  nombre completo `projects/.../templates/...`); si falta alguno el arranque
  falla con `SVC-CORE-9006`. El endpoint es regional y debe coincidir con la
  ubicación del template. `MODEL_ARMOR_ENABLED=false` mantiene el guardrail
  fail-closed. `MODEL_ARMOR_DEIDENTIFY_TEMPLATE` y `SDP_*` aún no se usan.
- `OTEL_*`: telemetría sin contenido privado y métricas de evaluadores TypeScript.
- `LANGFUSE_*`: dependencia declarada para Langfuse Cloud US como visualizador
  OTel metadata-only (ADR 0012/0015). `LANGFUSE_ENABLED` permanece `false` y el
  exportador no envía tráfico hasta P0-33; no se usa Docker self-host en P0.

LangSmith, DeepEval, Promptfoo y DeepAgents no son dependencias ni destinos de
telemetría P0: `../../docs/planning/evals.md` establece OTel + BigQuery y
evaluadores TypeScript/JEV como la ruta vigente. Los flags de integración permanecen desactivados hasta que su adaptador,
contrato, pruebas y políticas de región/retención estén implementados. Firestore
es durable; Valkey solo mantiene estado con TTL.

## Baseline comparativo de chat

`CHAT_PIPELINE=demo` conserva el runner determinista local. Para seleccionar el
comparador clásico se necesitan, en el entorno del proceso, `CHAT_PIPELINE=baseline`,
`BASELINE_CHAT_ENABLED=true`, `VERTEX_AI_*`, `BIGQUERY_ENABLED=true`,
`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `BIGQUERY_DATASET`,
`DEMO_AUTH_ENABLED=true`, `DEMO_ACTOR_HMAC_KEY`, `REALTIME_ENABLED=true` y
`CORS_ALLOWED_ORIGINS`. El backend usa ADC/IAM; no acepta una clave de servicio
en Git. `BASELINE_QUERY_CATALOG_PATH` apunta por defecto al catálogo de ejemplo
y `BASELINE_MAX_RETRIEVAL_ATTEMPTS` está limitado a uno o dos intentos.
El backend rechaza el arranque si falta alguno o si se intenta mezclarlo con
`AGENTIC_CHAT_ENABLED=true` (`SVC-CORE-9011`). El cliente no puede elegirlo.

El baseline recibe texto, el DDL estático de las tablas relevantes del
diccionario y una herramienta nativa `retrieve_context`. La herramienta carga
los tres `QueryPlan` de ejemplo, liga el `customer_id` al actor demo desde la
sesión y ejecuta una consulta acotada; ni el navegador ni el modelo aportan SQL
o identificadores de cliente. Sus filas retornan al modelo, por lo que sólo es
aceptable para datos sintéticos o expresamente aprobados para el experimento.
Intencionalmente no invoca privacidad, Model Armor, JEV, policy, filtrado de
roles, evidencia ni recuperación gobernada. La observación saneada contiene
duración, llamadas de modelo, intentos/éxitos de recuperación, resultado y
error allowlisted, sin prompt, parámetros ni filas; `BaselineChatEvaluator` la
puede comparar después con las métricas de ADR 0015.
