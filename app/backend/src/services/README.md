# services

Casos de uso. Orquestan dominio e integraciones sin acoplarse al transporte HTTP.

Los servicios dependen de interfaces, no de adaptadores concretos. Eso mantiene la regla de inversion de dependencias y permite reemplazar memoria por DB, cola o API externa sin tocar el caso de uso.

`private-tool-resolution.ts` recarga la sesión desde `SessionStore` justo antes
de resolver un handle; no acepta un `SessionContext` cacheado por el grafo.

`AgentControlService` coordina, pero no implementa, el flujo formal de control.
Las etapas están en `control-plane/`: `AgentInputStage`, `AgentDecisionStage`,
`AgentPolicyStage`, `AgentRouteStage` y `AgentResponseStage`. Esta composición
mantiene la secuencia sesión → normalización en backend → firewall de privacidad
determinista del backend → prompt sin PII → guardrail
sobre el último mensaje minimizado → Jev domain gate →
out_of_domain/clarify o decisión → policy → ruta → recuperación/tool →
generación → reemplazo validado → respuesta.

`control-plane/rag-state-graph.ts` es la rama de recuperación como `StateGraph`
y mantiene la memoria conversacional por hilo. Con un `checkpointer` inyectado,
cada turno agrega su mensaje a `history` (máximo `MAX_CONVERSATION_TURNS`) y el
JEV primario recibe los turnos previos. `begin_turn` reinicia el estado por
turno (`terminalReason`, `catalog`, `executionOrder`). El `thread_id` se obtiene
con `ragThreadConfig`, que lo liga a tenant, usuario y sesión. El llamador debe
entregar `query` ya desidentificado: el grafo no guarda texto crudo. El
adaptador actual (`integrations/memory/in-memory-checkpointer.ts`) es volátil y
por proceso; Valkey lo sustituirá detrás del mismo puerto.

`observability/telemetry-sanitizer.ts` es el único punto por el que un resultado
de evaluación se convierte en telemetría: construye atributos de span, de
métrica y registros BigQuery y los valida contra el contrato cerrado de
`domain/observability` antes de entregarlos a un exportador.
`observability/trace-correlator.ts` deriva el pseudónimo HMAC que sustituye al
`trace_id` crudo. `EvaluationRunner` acepta un `EvaluationTelemetry` opcional
(`ports/evaluation-telemetry.ts`); su fallo nunca altera una evaluación.

`evaluation/baseline-run-evaluation-observer.ts` implementa `BaselineRunObserver`:
convierte la medición sin contenido de cada turno del chat baseline en un span y
en filas de evaluación, evaluando sólo con `BaselineChatEvaluator` (los
evaluadores compartidos juzgarían compuertas que el baseline no invoca). Espera
la entrega con un tope de 2 s y nunca lanza: un fallo se cuenta en
`failedDeliveries`, se notifica a `onFailure` con un código cerrado
(`LiveDeliveryFailure`, nunca un mensaje del proveedor) y no altera la respuesta.

`ports/evaluation-result-sink.ts` define `EvaluationResultSink`, el destino
durable de los resultados de evaluación saneados. Devuelve un resultado con
códigos cerrados de fallo y nunca lanza: persistir mal no altera una evaluación.
`control-plane/rag-retrieval-runtime.ts` es el composition root que une un
`KnowledgeGraphRuntime` (local o GCS) con `createRagStateGraph`. El servidor lo
decora como `ragRetrievalRuntime` cuando hay bucket/local KG. El JEV de KG
default niega hasta inyectar un selector productivo; Structured RAG permanece
opt-in.

`ports/customer-identity.ts` define `CustomerIdentityResolver`: devuelve el
`customer_id` de la sesión verificada o `null`. Las consultas de datos usan ese
valor y no aceptan uno del prompt, del navegador ni del modelo; `null` significa
fallar cerrado sin ejecutar ninguna consulta.

`data/query-catalog-loader.ts` y `data/query-sql-validator.ts` validan el
catálogo de Structured RAG; `retrieval/structured-catalog-repository.ts` lo
sirve filtrado por rol y expone `resolve` para el ejecutor. Un catálogo
ilegible o inválido nunca se sirve: el repositorio responde `unavailable` y el
grafo se cierra antes del JEV especializado.

`ports/structured-query.ts` define `StructuredQueryExecutor` y
`StructuredQueryDryRunner`. `data/query-row-projection.ts` conserva solo las
columnas declaradas y comprueba el tipo de cada celda; `data/query-dry-run-check.ts`
compara un dry run con lo que declara la entrada (mismas columnas y tipos, y
bytes estimados dentro del tope). Ambos fallan cerrados.

`retrieval/structured-rag.ts` ejecuta Structured RAG. Un `StructuredQuerySelector`
(el juez especializado) responde `select`, `ambiguous` o `deny`; nunca SQL. Solo
ve `id`, `version`, `description` y los parámetros que el llamador puede rellenar,
y su elección debe ser una entrada del catálogo que se le mostró. Después
`data/query-parameter-binder.ts` valida esos valores contra el catálogo e inyecta
`customer_id` desde `CustomerIdentityResolver`: un llamador no puede aportar ni
nombrar un parámetro de sesión. El resultado se convierte en `EvidenceDTO`
(`retrieval/structured-evidence.ts`) y a `ModelEvidence` al cruzar al modelo, sin
SQL, tablas, job ni identidad. Cada fallo es un código cerrado (`structured_*`);
`structured_selection_ambiguous` y `structured_parameters_missing` quedan en
`terminalReason` para que policy decida si aclarar. El selector recibe solo la
consulta actual: un seguimiento ("¿y el mes pasado?") necesita pasar `history` a
la recuperación, y todavía no se hace.

`retrieval/structured-selection.ts` separa los dos papeles del selector:
`StructuredEntryChooser` (el JEV elige una entrada del catálogo que se le
mostró, o dice que ninguna sirve o que no está seguro) y
`StructuredParameterInterpreter` (un LLM lee los parámetros de la entrada
elegida). `ComposedStructuredQuerySelector` los une con el contrato que ya
consume `StructuredRag`; la respuesta del juez solo se acepta si nombra una
entrada del catálogo mostrado, y la del intérprete se descarta salvo los
parámetros declarados con valor. Ninguno ve SQL, tablas ni datos.

Los handlers de ruta viven en `control-plane/routes/` y son intercambiables.
Los datos autorizados se desidentifican antes de generar, y el reemplazo de
tokens se valida antes del guardrail final. La decisión y la generación usan
puertos separados para evitar que un proveedor de router quede acoplado a la
respuesta.

La prueba de comportamiento determinista está en
`tests/behavioral-flow.test.ts`. El proveedor regex de privacidad es solo un
adaptador de prueba/MVP; Sensitive Data Protection debe conectarse detrás de
`ContentPrivacyProvider`. Google Model Armor ya tiene adaptador detrás de
`GuardrailProvider` (`integrations/providers/model-armor-guardrail-provider.ts`,
creado con `createGuardrailProvider`): cualquier `MATCH_FOUND` bloquea y
cualquier fallo, timeout o invocación parcial es `FAILURE`/`block`. Aún falta
el composition root que lo inyecte en `AgentControlService`.

Jev se consume como decisión estructurada y versionada. Su dominio, confianza y
route hint solo orientan el flujo; la autorización continúa en `PolicyEngine`.
Las solicitudes fuera de dominio terminan con una plantilla segura y las
solicitudes ambiguas crean una aclaración durable sin ejecutar RAG, tools o
generación.

`baseline/baseline-conversation-runner.ts` no hereda de `AgentControlService`:
ambos comparten solamente el puerto `ConversationRunner`. El baseline recibe un
`BaselineChatModel` con function calling, el DDL estático de soporte/disputas y
un `BaselineContextTool`. El tool reutiliza mecánica de `QueryPlan` (binding de
sesión y límites de ejecución) pero no el selector, gates ni evidencia de la
ruta gobernada. `BaselineRunObserver` recibe únicamente mediciones saneadas
para evaluación comparativa. Con `LLM_CACHE_ENABLED`, consulta
`LlmEphemeralCache` (Valkey `llm:resp:v1:`) antes de Vertex; la clave lleva
`graphRunId`/`catalogVersion` y el hash del mensaje ya tratado como entrada de
cache (sin guardar el prompt crudo).

`ports/llm-ephemeral-cache.ts` y `llm/prompt-hash.ts` definen el exact-match
efímero; la implementación es `integrations/kv/kv-llm-cache.ts`.

- `ports/` contiene interfaces para modelos, guardrails, policy, tools,
  retrieval, workflows, idempotencia, auditoría y cache LLM efímero.
- `control-plane/` implementa el orden de mediación y los presupuestos.
- `tools/` valida registry, argumentos, capability, policy, timeout, output e
  idempotencia antes y después de ejecutar.
- `workflows/` persiste propuestas y revalida aprobaciones al reanudar.
- `retrieval/`, `data/` y `disclosure/` aplican aislamiento, contratos cerrados
  y minimización.
