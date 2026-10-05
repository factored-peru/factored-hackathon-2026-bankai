# Domain

Schemas, tipos y errores puros. No importa Fastify ni clientes externos.

`session.ts` define los puertos de sesión y broker privado. Valkey se implementa
en `src/integrations` para estado efímero; casos, checkpoints y aprobaciones
durables se resuelven por un puerto Firestore.

- `control/`: guardrails, policy, disclosure y presupuestos.
- `tools/`: definiciones versionadas y resultados de ejecución.
- `workflows/`: propuestas, aclaraciones, estados y aprobaciones.
- `retrieval/`: evidencia con provenance y consultas server-side.
  `evidence.ts` define `EvidenceDTO` (origen, versión, filtros, relaciones y
  métricas); no incluye SQL, tablas ni identificadores de tenant o cliente.
- `data/`: `QueryPlan` cerrado para acceso determinista a BigQuery.
  `query-catalog.ts` define el catálogo versionado: cada entrada declara su
  template `SELECT`, parámetros (`caller` los aporta y valida el backend;
  `session` los inyecta el backend), columnas permitidas con clasificación,
  roles y topes de filas y bytes facturados. Las comprobaciones que leen el SQL
  pertenecen al cargador del catálogo, no a este esquema.
- `observability/`: eventos allowlisted sin contenido sensible.
  `telemetry-attributes.ts` es el contrato cerrado de atributos metadata-only
  para spans OTel/Langfuse y métricas de baja cardinalidad;
  `evaluation-result-record.ts` define el registro versionado de resultados
  que se persiste en BigQuery. El saneador que los aplica vive en
  `services/observability/`.
- `disputes/`: contratos de evidencia/caso, matriz de capacidades
  ALLOW/DENY/REQUIRE_APPROVAL (`capability-matrix.ts`) y pack sintético
  versionado (`demo-fixtures.ts`) para la demo local.
