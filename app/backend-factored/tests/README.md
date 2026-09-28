# tests

Pruebas con `bun test`.

- `tests/contract`: valida OpenAPI y el contrato HTTP.
- `tests/error-codes.test.ts`: valida la taxonomia de errores y el registro de
  codigos.
- `tests/health.test.ts`: valida health/readiness e integraciones opcionales.
- `tests/items.test.ts`: valida el caso de uso demo.
- `tests/session.test.ts`: valida sesiones KV, cifrado y handles single-use con
  un double tipado, sin requerir un Valkey o Redis local.
- `tests/session-runtime.test.ts`: valida selección de Valkey/Redis e inyección
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
