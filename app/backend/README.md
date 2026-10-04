# Backend

API y control plane online de Dispute Transaction Support.

## Stack

- Bun `>=1.4`, TypeScript estricto, Fastify 5 y Zod 4.
- LangGraph.js `StateGraph` para workflow online determinista; ReAct queda como
  decisión pendiente, no como loop activo.
- Firebase Admin para identidad; Firestore para estado durable.
- Memorystore for Valkey mediante `node-redis` para SessionManager y
  coordinación efímera.
- BigQuery para Structured RAG y GCS para artefactos versionados de KG-RAG.

La recuperación vectorial está desconectada: no existe corpus ni vector store
autorizado. Structured RAG y KG-RAG usan catálogos cerrados y fallan cerrados
hasta que sus adaptadores se implementen.

Structured RAG ya dispone del adaptador BigQuery, pero el catálogo de producción
permanece vacío hasta aprobar vistas curadas y sus contratos. El adaptador usa
Application Default Credentials: en escritorio, `gcloud auth application-default
login`; en Cloud Run, una service account adjunta. No usa claves JSON ni acepta
SQL, dataset, tabla o filtros enviados por navegador, prompt o modelo.

La integración de frontend define OpenAPI para HTTP y `specs/asyncapi.json` para
eventos de chat. El perfil `dev` habilita un demo autocontenido: aliases mock,
sesiones, evidencia de disputa, conversación incremental y adjuntos viven sólo
en memoria. Producción requiere Firebase Auth, Firestore, Valkey y GCS
configurados; las conversaciones persistidas son saneadas y los binarios nunca
viajan por WebSocket.

Python no forma parte de este proceso: el procesamiento y el grafo se producen
en `../../data-ingestion-and-processing/`.

## Estructura

```text
src/          configuración, dominio, HTTP, servicios e integraciones
config/       perfiles versionables
specs/        OpenAPI canónico
scripts/      validación y simulación TypeScript
tests/        pruebas de contrato y comportamiento
docs/         SDD, errores, SOLID y operación específica del backend
```

Las decisiones compartidas viven en `../../docs/adr/` y la arquitectura en
`../../docs/architecture-control-plane.md`.

## Alcance de disputas

La vertical actual consulta evidencia de transacción, disputa y caso mediante
contratos cerrados por tenant. Puede solicitar un **escalamiento mock**: un
operador decide aprobarlo o rechazarlo y, si se aprueba, se emite un receipt
verificado con efecto `none`. No existe endpoint ni herramienta para presentar,
cancelar o modificar una disputa bancaria real.

## Guía de invocación

Todos estos comandos se ejecutan desde `app/backend/`. Con Bun `>=1.4`, el
primer `bun run dev` puede resolver las dependencias desde `bun.lock` sin crear
un `.env`; requiere acceso al registro npm si no están en su caché. `bun install`
sigue siendo el paso recomendado antes de editar, probar o usar herramientas de
IDE, y no debe sustituir el lockfile versionado.

```bash
bun install
bun run spec:check
bun test
bun run check-types
bun run check
```

| Objetivo | Comando | Efecto |
| --- | --- | --- |
| Desarrollo con recarga | `bun run dev` | Inicia el servidor vigilado; detener con `Ctrl+C`. |
| Ejecución sin vigilancia | `bun run start` | Inicia el servidor con la configuración activa. |
| Compilación | `bun run build` | Emite la compilación TypeScript de producción. |
| Contrato | `bun run spec:check` | Verifica OpenAPI sin modificar fuentes. |
| Calidad | `bun test`, `bun run check-types`, `bun run check` | Ejecuta pruebas, tipos y Biome de sólo comprobación. |
| Matriz de agente | `bun run agent:matrix` | Ejecuta la simulación declarada para variantes del agente. |
| Prueba local de Structured RAG | `bun run structured:try -- --question "..."` | El JEV (TypeSafe) elige la entrada del catálogo y Vertex AI lee los parámetros; muestra la selección y los valores ligados sin ejecutar nada en BigQuery. Con `--execute --customer <id>` corre la consulta real. Envía la pregunta a proveedores externos: solo texto sintético (ADR 0010). Requiere autorización explícita y credenciales. |
| Dry run del catálogo | `bun run catalog:dry-run` | Pide a BigQuery el plan de cada consulta del catálogo y compara columnas, tipos y bytes; no lee filas. Alcanza la nube: requiere autorización explícita, `BIGQUERY_ENABLED=true` y credenciales ADC (`gcloud auth application-default login`). |

`bun run format` modifica archivos y sólo se usa cuando una tarea autorice el
formateo. Bun documenta los [scripts](https://bun.sh/docs/runtime) y las
[pruebas](https://bun.sh/docs/test) como estas invocaciones.

## Baseline comparativo sin control plane

El backend contiene un chat LLM clásico para comparar posteriormente
completitud, latencia, errores y exposición potencial contra el control plane.
Se selecciona por proceso, nunca por HTTP o WebSocket:

```bash
cd app/backend
CHAT_PIPELINE=baseline \
BASELINE_CHAT_ENABLED=true \
VERTEX_AI_ENABLED=true \
VERTEX_AI_PROJECT_ID=factored-hackathon \
VERTEX_AI_LOCATION=us-central1 \
VERTEX_AI_MODEL=MODELO_APROBADO \
BIGQUERY_ENABLED=true \
GOOGLE_CLOUD_PROJECT=factored-hackathon \
GOOGLE_CLOUD_LOCATION=us-central1 \
BIGQUERY_DATASET=DATASET_APROBADO \
DEMO_AUTH_ENABLED=true \
DEMO_ACTOR_HMAC_KEY=VALOR_SECRETO_LOCAL \
REALTIME_ENABLED=true \
CORS_ALLOWED_ORIGINS=http://localhost:3001 \
bun run dev
```

Requiere ADC/IAM válidas para Vertex y BigQuery. Mantiene el mismo contrato de
conversación y streaming; el prompt incluye el DDL estático de las tablas de
soporte y disputas del PDF del datathon. El modelo puede invocar nativamente
`retrieve_context` hasta dos veces, sólo con uno de los tres `QueryPlan` del
catálogo de ejemplo (`customer_products`, `product_status`,
`recent_transactions`). El backend inyecta el cliente ligado al actor demo y
conserva límites de filas, bytes y timeout del plan; el modelo no recibe SQL ni
elige un cliente. Las filas recuperadas sí regresan al modelo: usa únicamente
un dataset/actor de prueba aprobado, no información bancaria real.

Por diseño no ejecuta privacidad, Model Armor, JEV, policy, filtrado por rol,
proyección de evidencia ni el `StateGraph`; no es la ruta factual autorizada
del producto. Sus métricas sin contenido permiten comparar completitud,
latencia, fallos y posibles leaks contra el control plane. Para volver al modo
local autocontenido, omite esas variables o usa `CHAT_PIPELINE=demo`.

## Demo local para frontend

Desde un clon nuevo, inicia sólo el backend:

```bash
cd app/backend
bun run dev
```

El perfil versionado `dev` escucha en `http://localhost:3000`, habilita CORS
con credenciales únicamente para `http://localhost:3001` y
`http://127.0.0.1:3001`, y usa la cookie local `bankai-demo-session`. No lee
BigQuery, Firebase, Firestore, GCS, Valkey ni secretos. Todo estado se pierde al
detener el proceso.

| Recurso | URL | Uso demo |
| --- | --- | --- |
| Referencia HTTP | `GET /docs` | Scalar sobre el OpenAPI canónico. |
| Contrato HTTP | `GET /openapi.json` | Endpoints, payloads, cookies y ejemplos. |
| Contrato realtime | `GET /asyncapi.json` | Eventos del socket `GET /v1/realtime`. |
| Aliases | `GET /v1/demo/actors` | `demo-customer-1` y `demo-backoffice-1`. |
| Fixture | `GET /v1/demo/fixtures` | IDs sintéticos de transacción, disputa y caso. |

Flujo mínimo para el cliente: consulta aliases, crea sesión con
`POST /v1/demo/sessions` y `{ "actorId": "demo-customer-1" }`, usa
`credentials: "include"` en cada `fetch`, consulta `GET /v1/me` y abre
`ws://localhost:3000/v1/realtime`. El navegador debe ejecutarse en uno de los
orígenes permitidos para que el handshake WebSocket acepte la cookie.

Los datos de prueba en memoria son deliberadamente sintéticos:

| Endpoint | ID o payload de prueba |
| --- | --- |
| `GET /v1/transactions/{transactionId}` | `demo-transaction-1` |
| `GET /v1/disputes/{disputeId}` | `demo-dispute-1` |
| `GET /v1/dispute-cases/{caseId}` | `demo-case-1` |
| `POST /v1/dispute-cases/demo-case-1/escalations` | `{ "reasonCode": "transaction_declined" }` como cliente. |
| `POST /v1/approvals/{approvalId}/decisions` | `{ "decision": "approved" }` tras iniciar como `demo-backoffice-1`. |

Para enviar una conversación, envía por WebSocket un evento `chat.send` con un
`clientMessageId`, texto y opcionalmente `attachmentIds`; el servidor emite
`run.state`, `assistant.delta`, `assistant.completed` y un snapshot. Para una
imagen o audio: crea la autorización con `POST /v1/uploads`, hace `PUT` de los
bytes a la `uploadUrl` recibida con el mismo `Content-Type` autorizado,
llama `POST /v1/uploads/{attachmentId}/complete` y recién entonces usa su ID en
`chat.send`. La demo exige que tamaño y tipo coincidan con la autorización.

Ejemplo HTTP con cookie persistida:

```bash
curl -c demo.cookie -X POST http://localhost:3000/v1/demo/sessions \
  -H 'content-type: application/json' \
  --data '{"actorId":"demo-customer-1"}'
curl -b demo.cookie http://localhost:3000/v1/transactions/demo-transaction-1
```

Para desarrollo local con Valkey, desde este directorio primero entrega
`SERVICE_TOKEN` por el entorno seguro y renderiza Compose; el archivo exige esa
variable incluso en el perfil local:

```bash
docker compose -f ../../deploy/local/backend-compose.yml config
docker compose -f ../../deploy/local/backend-compose.yml up --build
# al terminar
docker compose -f ../../deploy/local/backend-compose.yml down
```

No añadas `-v` a `down` salvo que la tarea autorice borrar volúmenes. Consulta
la referencia oficial de [Docker Compose](https://docs.docker.com/reference/cli/docker/compose/)
para el ciclo y sus efectos.

El contrato público permanece en `specs/openapi.json`. Cambia primero la spec,
luego rutas, schemas Zod, pruebas y documentación.
