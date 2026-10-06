# Integraciones

Adaptadores de infraestructura reemplazables por implementaciones reales.

- `database.ts`: placeholder local para el puerto durable; producción usará
  Firestore para casos, checkpoints y aprobaciones.
- `bucket.ts`: placeholder para GCS con artefactos de grafo versionados.
- `cache.ts`: facade local para coordinación efímera.
- `kv/`: contrato y adaptador RESP `node-redis` para Memorystore for Valkey.
  `KvLlmCache` implementa `LlmEphemeralCache` en el namespace `llm:resp:v1:` del
  mismo cliente (flag `LLM_CACHE_ENABLED`); no guarda prompts crudos ni evidencia.
- `bigquery/`: ejecutor ADC para planes Structured RAG catalogados; aplica
  tenant server-side, parámetros nombrados, límite de bytes, timeout y filas.
- `firestore/`: snapshots conversacionales saneados con revisión optimista,
  `user_profiles` y bindings de identidad; requiere Firestore. Colecciones:
  [`docs/firestore-collections.md`](../docs/firestore-collections.md).
- `cache/lru-memo.ts`: LRU de proceso (equivalente a `functools.lru_cache`)
  sólo en adapters (`CachingSessionStore`, conversation get, identity, cohort
  BigQuery demo). No sustituye Valkey ni se usa en el control plane.
- `gcs/`: carga privada de adjuntos por URL firmada; nunca transporta binarios
  por WebSocket ni los entrega a un modelo en el MVP.
- `memory/`: dobles volátiles para pruebas, nunca persistencia de producción.
- `bigquery/`: `BigQueryQueryExecutor` ejecuta entradas del catálogo como jobs
  parametrizados, con `maximumBytesBilled`, tiempo límite, etiquetas sin
  contenido y sin dataset por defecto. Falla con códigos cerrados y nunca
  devuelve el mensaje del proveedor. `wrapBigQuery` adapta el cliente real; no
  abre conexión al crearse ni al importarse. `dryRun` valida una entrada contra
  las tablas reales sin leer filas.
- `bigquery/structured-rag-runtime.ts`: única fábrica que convierte la
  configuración en adaptadores de Structured RAG (fuente del catálogo,
  repositorio y ejecutor). Falla cerrada con `BIGQUERY_ENABLED=false` y no abre
  conexión: el cliente se autentica con ADC al crear el primer job. El selector
  y el resolver de identidad se inyectan; no son configuración de BigQuery.
- `bigquery/bigquery-evaluation-result-sink.ts`: persiste los registros
  versionados `v1` de resultados de evaluación con inserciones en streaming, en
  lotes de 500, con `insertId` igual a la clave natural completa
  (`runId:fixtureId:route:metric:evaluator`). Vuelve a validar cada registro
  contra el esquema estricto y uno inválido no escribe nada; `skipInvalidRows` e
  `ignoreUnknownValues` están apagados para que una fila rechazada falle en voz
  alta. Falla con códigos cerrados (`sink_invalid_record`, `sink_rejected_rows`,
  `sink_not_found`, `sink_permission_denied`, `sink_auth_failed`,
  `sink_billing_required`, `sink_unavailable`) derivados del estado HTTP y del
  `reason` de Google; nunca lanza ni conserva el mensaje del proveedor.
  `evaluation-result-sink-runtime.ts` es su fábrica: con
  `BIGQUERY_EVAL_DATASET` vacío devuelve `null` y no abre conexión; el cliente se
  autentica con ADC en el primer insert. `memory/in-memory-evaluation-result-sink.ts`
  es el doble para pruebas.
- `observability/live-baseline-observer-runtime.ts`: fábrica del observador del
  chat baseline. Devuelve `null` salvo que `CHAT_PIPELINE=baseline` y esté
  activo Langfuse (`OTEL_ENABLED`) o BigQuery (`BIGQUERY_EVAL_DATASET`); si no,
  no crea nada. `server.ts` se lo entrega al `BaselineConversationRunner` y
  llama a su `shutdown` en `onClose`.
- `evaluation/create-control-plane-conversation-runtime.ts`: composition root
  del chat `CHAT_PIPELINE=control_plane`. Ensambla `AgentControlService` con
  policy de disputa, workflows en memoria y, si hay `ragRetrievalRuntime`,
  `FactualRagRouteHandler` en `database`/`rag`. `requiresEscalation` enruta vía
  síntesis de `escalation.request` en decision-stage; Policy autoriza
  `REQUIRE_APPROVAL`.
- `providers/heuristic-hitl-decision-signal-provider.ts`: señal primaria
  determinista (H14 humano, H2/H8 reclamo/estafa, OOD confiado, answerable).
- `providers/safe-informational-model-provider.ts`: respond/compose stub sin
  Vertex para rutas `answerable` en control_plane.
- `observability/otel-telemetry-runtime.ts`: única fábrica de la ruta de
  telemetría. Con `OTEL_ENABLED=false` devuelve `null` y no crea nada. Activa,
  compone un `TracerProvider` aislado (nunca global, sin autoinstrumentación ni
  callbacks) con `BatchSpanProcessor` hacia `SanitizingSpanExporter` y el
  exportador OTLP/HTTP de Langfuse Cloud US (`langfuse-otlp-config.ts`: endpoint
  `/api/public/otel/v1/traces`, Basic auth y `x-langfuse-ingestion-version: 4`).
  Se niega a arrancar si hay variables `OTEL_EXPORTER_OTLP_*` en el entorno.
  `flush()` debe llamarse antes de que un proceso corto termine.
- `observability/sanitizing-span-exporter.ts`: última compuerta antes de salir.
  Descarta —y sólo cuenta, sin registrar— todo span con nombre o atributos fuera
  del contrato, eventos, enlaces, mensaje de estado libre o atributos de recurso
  inesperados.
- `observability/otel-evaluation-telemetry.ts`: emite un span por fixture
  evaluado (y, si recibe un `Meter`, un punto de métrica de baja cardinalidad
  por resultado) con un `Tracer` inyectado. Todos los atributos salen del
  saneador; si uno incumple el contrato descarta el fixture completo, lo
  cuenta en `droppedCount` y nunca lanza.
- `catalog/`: `FileQueryCatalogSource` lee el catálogo JSON de una ruta fijada
  por configuración; la validación vive en `services/data`.
- `identity/`: resuelve la sesión al `customer_id` bancario.
  `StaticCustomerIdentityResolver` es un mapa fijo para demos y pruebas.
  `FirestoreCustomerIdentityResolver` + `user_profiles` /
  `UserProfileBackedActorDirectory` cubren el camino durable.
- `providers/typesafe-system-one.ts`: cliente HTTP compartido
  (`POST /v1/systemone`) para choice / noul / score.
-   `providers/typesafe-entry-chooser.ts`: el JEV de TypeSafe como juez
  especializado de catálogo (una pregunta `choice` sobre las entradas más
  `none_of_the_above`). Confianza por debajo de `JEV_MIN_CONFIDENCE` o ausente
  es ambigua; una opción desconocida es `deny`. Los errores llevan un mensaje
  cerrado y nunca la clave ni el cuerpo de la respuesta.
  `providers/typesafe-kg-operation-chooser.ts` es el espejo para operaciones
  del catálogo KG (misma forma `choice`, instrucciones en inglés, sin
  artefactos crudos). `providers/vertex-parameter-interpreter.ts` usa el SDK
  oficial de Vertex AI con ADC para interpretar parámetros, y trata el mensaje
  como dato. `providers/structured-selector-runtime.ts` y
  `providers/knowledge-graph-selector-runtime.ts` componen chooser + intérprete;
  un proveedor desactivado falla cerrado, nunca cae en otro modelo.
- `tools/` y `providers/`: registros allowlisted y proveedores fail-closed.

`providers/vertex-baseline-chat-provider.ts` es una excepción deliberada para
el experimento comparativo: adapta Vertex function calling sin incorporar
gates. El composition root lo combina con `BaselineQueryTool` sólo cuando
`CHAT_PIPELINE=baseline` y `BASELINE_CHAT_ENABLED=true`; ese tool recibe el
adaptador BigQuery, pero conserva QueryPlan, binding de sesión y límites. La
configuración y alcance experimental están documentados en `config/README.md`
y ADR 0004/0015.

Los adaptadores no se conectan durante import-time. El composition root los
crea, inyecta y cierra. Los puertos permanecen en `src/services/ports`; ninguna
ruta HTTP conoce detalles de GCS, BigQuery, Firestore o Valkey.
