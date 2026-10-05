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
autorizado. Structured RAG y KG-RAG usan catálogos cerrados y fallan cerrados.
El backend lee el grafo publicado en GCS con el mismo contrato que el pipeline
(`GCS_GRAPH_BUCKET` + `{tenant}/current.json`); el chat baseline aún no inyecta
ese runtime en el control plane.

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

| Objetivo                 | Comando                                            | Efecto                                                     |
| ------------------------ | -------------------------------------------------- | ---------------------------------------------------------- |
| Desarrollo con recarga   | `bun run dev`                                      | Inicia el servidor vigilado; detener con `Ctrl+C`.         |
| Ejecución sin vigilancia | `bun run start`                                    | Inicia el servidor con la configuración activa.            |
| Compilación              | `bun run build`                                    | Emite la compilación TypeScript de producción.             |
| Contrato                 | `bun run spec:check`                               | Verifica OpenAPI sin modificar fuentes.                    |
| Calidad                  | `bun test`, `bun run check-types`, `bun run check` | Ejecuta pruebas, tipos y Biome de sólo comprobación.       |
| Matriz de agente         | `bun run agent:matrix`                             | Ejecuta la simulación declarada para variantes del agente. |
| Evaluación de goldens    | `bun run eval:run`                                 | Calcula la matriz determinista e imprime un resumen sin contenido; no envía nada ni toca la red. |
| Chat de prueba           | `bun run chat:try -- --message "hola"`             | Cliente de consola del WebSocket de un backend ya levantado (local, Docker o desplegado con `--allow-remote`). No inicia nada; el backend al que apunta puede llamar a la nube. |
| Evaluación con emisión   | `bun run eval:run -- --emit`                       | Además envía un span por fixture a Langfuse Cloud US y cada resultado a BigQuery, según lo configurado. Sale con código 1 si un canal falla o no hay ninguno configurado. Alcanza la nube: requiere autorización explícita y credenciales fuera de Git. |
| Seed identidad demo      | `bun run seed:firestore-demo-identity`             | Dry-run del plan `user_profiles` + bindings (sin GCP). `--execute` escribe Firestore y exige autorización; ver `docs/firestore-collections.md`. |

### Probar el chat a mano, en local o en Docker

`bun run chat:try -- --message "hola"` abre una sesión demo y el WebSocket
`/v1/realtime` de un backend ya levantado, envía los mensajes y muestra los
estados y la respuesta. Sin `--message` abre un prompt interactivo (`/salir`
termina). Opciones: `--url` (por defecto `http://localhost:3000`), `--actor`
(`demo-customer-1`), `--origin` (debe estar en `CORS_ALLOWED_ORIGINS`) y
`--timeout`. Sale con 1 si un turno termina en problema o `failed`. Una URL que
no sea de esta máquina exige `--allow-remote`, porque un backend baseline
reenvía lo que escribes a Vertex AI (ADR 0010: sólo texto sintético).

Para el servicio completo en contenedor (Valkey incluido), desde `deploy/local/`
y con `SERVICE_TOKEN` en tu entorno:

1. **Sin nube** (chat demo en memoria):
   `docker compose -f backend-compose.yml -f chat-compose.yml up --build`, y en
   otra terminal `bun run chat:try -- --url http://localhost:8010`.
2. **Baseline real con telemetría en vivo**: añade
   `-f baseline-live-compose.yml` y define en tu shell `VERTEX_AI_PROJECT_ID`,
   `VERTEX_AI_LOCATION`, `VERTEX_AI_MODEL`, `GOOGLE_CLOUD_PROJECT`,
   `GOOGLE_CLOUD_LOCATION`, `BIGQUERY_DATASET`, `DEMO_ACTOR_HMAC_KEY` (cualquier
   valor aleatorio local) y `GOOGLE_ADC_FILE` (tu archivo de Application Default
   Credentials, que se monta de sólo lectura). La telemetría es opcional:
   `OTEL_ENABLED` y `LANGFUSE_ENABLED` juntos con sus claves y
   `TELEMETRY_CORRELATOR_KEY`, y `BIGQUERY_EVAL_DATASET` para las filas. Cada
   mensaje llama a Vertex AI y se factura. Detén todo con
   `docker compose -f backend-compose.yml -f chat-compose.yml down -v`.

Con la telemetría activa, cada turno del baseline emite un span `evaluation`
(`bankai.pipeline=baseline`, latencia, llamadas al modelo, intentos de
recuperación, código de error) y cuatro filas en BigQuery con
`evaluator=baseline_chat`, `matrix_version=live-baseline-v1` y
`fixture_id=live-baseline`. Todos los turnos de una misma conexión WebSocket
comparten `traceId` y, por tanto, correlador.

Qué buscar en el log del servicio (`docker compose ... logs base-bun-typescript-service`),
siempre con códigos cerrados y sin contenido:

| `event` | Significado |
| --- | --- |
| `live_telemetry_enabled` | Al arrancar: `spans` y `rows` indican qué canales quedaron activos. |
| `live_telemetry_not_used` | Hay telemetría configurada pero el pipeline no es `baseline`, que es el único que la emite. |
| `live_telemetry_delivery_failed` | Un turno no pudo entregar su telemetría. `reason`: `sink_not_found`, `sink_permission_denied`, `sink_auth_failed`, `sink_billing_required`, `sink_rejected_rows`, `sink_unavailable`, `export_failed` (Langfuse), `delivery_timeout` (más de 2 s) u `observer_error`. El chat responde igual. |

### Envío real de telemetría y resultados de evaluación

`eval:run -- --emit` es el único comando que lleva resultados de evaluación a
Langfuse Cloud US (spans OTLP, ADR 0012) y a BigQuery (registros `v1`, ADR
0015). Con fixtures sintéticos y sin contenido, pero alcanza sistemas externos:
no lo ejecutes sin una tarea que lo autorice.

1. Crea el dataset y la tabla (`deploy/terraform`, módulo `runtime`: `init
   -backend=false`, `validate`, `plan`; `apply` requiere autorización).
2. Define por entorno, nunca en Git: `OTEL_ENABLED=true`,
   `LANGFUSE_ENABLED=true`, `LANGFUSE_PUBLIC_KEY`, `LANGFUSE_SECRET_KEY`,
   `TELEMETRY_CORRELATOR_KEY` (16 o más caracteres), `BIGQUERY_ENABLED=true`,
   `GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION`, `BIGQUERY_DATASET`,
   `BIGQUERY_EVAL_DATASET` y, si no es el predeterminado, `BIGQUERY_EVAL_TABLE`.
   No definas ninguna `OTEL_EXPORTER_OTLP_*`: el arranque las rechaza.
3. Autentica ADC (`gcloud auth application-default login`).
4. Ejecuta `bun run eval:run -- --emit`. La salida es una línea JSON sin
   contenido con `emit.spans` y `emit.bigquery`; el código de salida es 0 sólo si
   todos los canales configurados tuvieron éxito. Si `emit.bigquery` falla, su
   `reason` indica qué corregir: `sink_not_found` (dataset o tabla inexistentes),
   `sink_permission_denied` (falta `bigquery.tables.updateData`),
   `sink_auth_failed` (ADC sin sesión), `sink_billing_required` (los inserts en
   streaming exigen facturación habilitada), `sink_rejected_rows` (la tabla no
   coincide con el esquema `v1`) o `sink_unavailable` (otro fallo del servicio).

`bun run format` modifica archivos y sólo se usa cuando una tarea autorice el
formateo. Bun documenta los [scripts](https://bun.sh/docs/runtime) y las
[pruebas](https://bun.sh/docs/test) como estas invocaciones.

## Demo local para frontend

Desde un clon nuevo, inicia sólo el backend:

```bash
cd app/backend
bun run dev
```

El perfil versionado `dev` escucha en `http://localhost:3000`, habilita CORS
con credenciales únicamente para `http://localhost:3001` y
`http://127.0.0.1:3001`, y usa la cookie local `bankai-demo-session`. Por
defecto no lee BigQuery, Firebase, Firestore, GCS ni Valkey: el estado vive en
memoria y se pierde al detener el proceso.

Para ejercitar stores productivos (sin `terraform apply`): habilita
`FIRESTORE_ENABLED` + `GCS_ENABLED` + `GCS_UPLOAD_BUCKET` (conversaciones,
adjuntos, `user_profiles`, bindings) y/o `SESSION_STORE_ENABLED` + `KV_URL` +
`PRIVATE_DATA_ENCRYPTION_KEY` (sesiones Valkey). Cache exact-match de respuestas
LLM: `LLM_CACHE_ENABLED` + `KV_URL` (mismo Memorystore, namespace `llm:`). Esquema:
[`docs/firestore-collections.md`](docs/firestore-collections.md).

| Recurso           | URL                     | Uso demo                                       |
| ----------------- | ----------------------- | ---------------------------------------------- |
| Referencia HTTP   | `GET /docs`             | Scalar sobre el OpenAPI canónico.              |
| Contrato HTTP     | `GET /openapi.json`     | Endpoints, payloads, cookies y ejemplos.       |
| Contrato realtime | `GET /asyncapi.json`    | Eventos del socket `GET /v1/realtime`.         |
| Aliases           | `GET /v1/demo/actors`   | `demo-customer-1` y `demo-backoffice-1`.       |
| Fixture           | `GET /v1/demo/fixtures` | IDs sintéticos de transacción, disputa y caso. |

Flujo mínimo para el cliente: consulta aliases, crea sesión con
`POST /v1/demo/sessions` y `{ "actorId": "demo-customer-1" }`, usa
`credentials: "include"` en cada `fetch`, consulta `GET /v1/me` y abre
`ws://localhost:3000/v1/realtime`. El navegador debe ejecutarse en uno de los
orígenes permitidos para que el handshake WebSocket acepte la cookie.

Los datos de prueba en memoria son deliberadamente sintéticos:

| Endpoint                                         | ID o payload de prueba                                              |
| ------------------------------------------------ | ------------------------------------------------------------------- |
| `GET /v1/transactions/{transactionId}`           | `demo-transaction-1`                                                |
| `GET /v1/disputes/{disputeId}`                   | `demo-dispute-1`                                                    |
| `GET /v1/dispute-cases/{caseId}`                 | `demo-case-1`                                                       |
| `POST /v1/dispute-cases/demo-case-1/escalations` | `{ "reasonCode": "transaction_declined" }` como cliente.            |
| `POST /v1/approvals/{approvalId}/decisions`      | `{ "decision": "approved" }` tras iniciar como `demo-backoffice-1`. |

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
