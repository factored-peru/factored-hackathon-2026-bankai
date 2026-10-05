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
`http://127.0.0.1:3001`, y usa la cookie local `bankai-demo-session`. No lee
BigQuery, Firebase, Firestore, GCS, Valkey ni secretos. Todo estado se pierde al
detener el proceso.

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
