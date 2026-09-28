# ADR

Architecture Decision Records aceptadas o propuestas para cambios de contrato y
arquitectura.

## Formato

- `Status`: `Proposed`, `Accepted`, `Deprecated` o `Superseded`.
- `Context`: problema y restricciones.
- `Decision`: cambio concreto elegido.
- `Consequences`: efectos esperados y tradeoffs.

## Registros

- `0001-bun-fastify-framework.md`: Bun, TypeScript y Fastify como framework base vigente.
- `0002-error-taxonomy.md`: contrato publico de errores RFC 9457.
- `0003-service-token-for-protected-routes.md`: token de servicio opcional para rutas protegidas.
- `0004-agent-control-plane.md`: capa de control para el agente bancario, con
	Google Model Armor, filtros de Vertex, Jev como domain gate y policy engine
	determinista.
- `0005-session-private-data-boundary.md`: sesión server-side, handles opacos,
  resolución privada de tool calls y política de divulgación.
- `0006-production-authentication-authorization.md`: autenticación fail-closed,
  sesiones browser, scopes y CSRF.
- `0007-durable-agent-execution-hitl.md`: checkpoints, reanudación y
  aprobaciones idempotentes.
- `0008-tool-registry-execution-contract.md`: registry allowlist y executor.
- `0009-sql-customer-data-access.md`: QueryPlan tipado, compilación SQL y RLS.
- `0010-provider-data-governance.md`: clases de datos, regiones, retención y
  límites por proveedor.
- `0011-rag-trust-tenant-isolation.md`: retrieval server-side y provenance.
- `0012-sensitive-observability.md`: telemetría GenAI sin contenido sensible.
- `0013-agent-resource-budgets.md`: límites globales de ejecución y costo.
- `0014-http-network-security-boundary.md`: CSRF, CORS, TLS, egress y SSRF.
- `0015-agent-evaluation-release-gates.md`: suites de evaluación y gates de
  release.
- `0016-pii-detection-and-deidentification.md`: firewall determinista del
  backend, SDP Advanced como detector principal y templates bancarios; no hay
  un modelo de IA local habilitado.
- `0017-kv-session-and-postgres-checkpointer.md`: Valkey predeterminado o Redis
  para sesiones y handles efímeros; PostgreSQL para checkpoints y aprobaciones
  durables.
- `0018-agent-execution-boundaries-and-evaluation.md`: orden normativo de las
  etapas, fronteras de datos, estados terminales y matriz de simulación.
