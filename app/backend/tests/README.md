# tests

Pruebas con `bun test`.

- `tests/contract`: valida OpenAPI y el contrato HTTP.
- `tests/telemetry-attributes.test.ts`, `tests/telemetry-sanitizer.test.ts` y
  `tests/otel-evaluation-telemetry.test.ts`: el contrato cerrado de telemetría,
  el saneador y el adaptador OTel. Verifican, con el golden set real y un
  exportador en memoria, que ni spans, métricas ni registros BigQuery llevan
  contenido, `trace_id` crudo ni IDs de alta cardinalidad.
- `tests/baseline-run-evaluation-observer.test.ts`: la telemetría en vivo del
  chat baseline con el `BaselineConversationRunner` real, un modelo simulado y
  exportador y tabla en memoria. Verifica el span y las filas de un turno, que
  sólo se juzgan métricas `baseline_*`, que nada contiene texto ni `trace_id`
  crudo y que la respuesta es idéntica con Langfuse y BigQuery caídos.
- `tests/chat-try.test.ts`: el cliente `chat:try` contra un servidor real en
  proceso, por un WebSocket verdadero (turno completo, mismo hilo, origen
  rechazado, actor desconocido) y la guarda de URLs remotas.
- `tests/evaluation-emission.test.ts`: `eval:run -- --emit` con exportador y
  sumidero en memoria y el comando real en un proceso hijo. Verifica un span por
  fixture y una fila por resultado con el mismo correlador, que un exportador o
  un almacén que falla produce código 1 y que ninguna salida contiene `trace_id`
  crudo ni claves. Sin `--emit` la salida no cambia.
- `tests/bigquery-evaluation-result-sink.test.ts`: el adaptador de BigQuery con
  un cliente simulado, sin red. Verifica que las columnas coinciden con el
  esquema de la tabla declarado en `deploy/`, que ninguna clave de idempotencia
  colisiona en el golden set (que reutiliza `fixtureId` entre rutas), el
  lote de 500, que un registro inválido no escribe nada y que ningún error
  reproduce valores de fila.
- `tests/telemetry-config.test.ts` y `tests/otel-telemetry-runtime.test.ts`:
  validación de arranque (`SVC-CORE-9017` a `9019`), destino único Langfuse
  Cloud US, compuerta final de spans y formato real de la petición OTLP contra un
  servidor local, incluido el rechazo de `OTEL_EXPORTER_OTLP_*` ambientales. No
  usan red externa.
- `tests/error-codes.test.ts`: valida la taxonomia de errores y el registro de
  codigos.
- `tests/health.test.ts`: valida health/readiness e integraciones opcionales.
- `tests/conversation-api.test.ts`: valida el contrato demo de sesión/chat.
- `tests/session.test.ts`: valida sesiones KV, cifrado y handles single-use con
  un double tipado, sin requerir un Valkey local.
- `tests/session-runtime.test.ts`: valida selección de Valkey e inyección
  de la factory sin abrir conexiones externas.
- `tests/agent-control.test.ts`: comprueba fallo cerrado, `DENY`, HITL y orden
  disclosure/sanitización.
- `tests/tool-execution.test.ts`: prueba complete mediation, schemas e
  idempotencia.
- `tests/workflow.test.ts`: prueba expiración, rotación y consumo único de
	aprobaciones, además de aclaraciones asociadas a la sesión.
- `tests/foundation-boundaries.test.ts`: prueba tenant RAG, QueryPlan,
  auditoría y presupuestos.
- `tests/behavioral-flow.test.ts`: prueba la secuencia completa y las rutas
	LLM, RAG, base de datos, reject, `out_of_domain` y aclaración, incluyendo
	privacidad de prompt y reemplazo validado.
- Las etapas del control plane se prueban a través de la secuencia completa;
  los doubles deterministas permiten verificar el orden y que Jev, el router y
  el generador nunca reciban el prompt original con PII.
- `tests/architecture.test.ts`: impide dependencias contrarias a las capas.
- `bun run agent:matrix -- --all`: ejecuta escenarios sintéticos adicionales de
  inyección, fallos de proveedor, aislamiento, replay y respuesta final. La
  salida humana es vertical y muestra el estado de cada frontera; `--json`
  conserva una traza segura para automatización.
- `tests/agent-matrix.test.ts`: valida la salida vertical y que JSON no exponga
  prompt, PII ni handles completos.
- `tests/baseline-chat.test.ts`: comprueba el ciclo function-calling del
  baseline, sus dos intentos máximos, streaming y mediciones sin contenido.
