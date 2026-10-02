# Domain

Schemas, tipos y errores puros. No importa Fastify ni clientes externos.

`session.ts` define los puertos de sesión y broker privado. Valkey se implementa
en `src/integrations` para estado efímero; casos, checkpoints y aprobaciones
durables se resuelven por un puerto Firestore.

- `control/`: guardrails, policy, disclosure y presupuestos.
- `tools/`: definiciones versionadas y resultados de ejecución.
- `workflows/`: propuestas, aclaraciones, estados y aprobaciones.
- `retrieval/`: evidencia con provenance y consultas server-side.
- `data/`: `QueryPlan` cerrado para acceso determinista a BigQuery.
- `observability/`: eventos allowlisted sin contenido sensible.
