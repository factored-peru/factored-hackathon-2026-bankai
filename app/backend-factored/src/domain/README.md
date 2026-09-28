# domain

Schemas, tipos y errores del dominio. No debe importar Fastify ni clientes externos.

`session.ts` define los puertos y tipos de sesión server-side y del broker de
datos privados. Valkey/Redis se implementa en `src/integrations`; la
persistencia PostgreSQL durable permanece detrás de puertos hasta incorporar su
adaptador.

Capacidades:

- `control/`: estado mínimo, guardrails, policy, disclosure y presupuestos.
- `tools/`: definiciones versionadas y resultados de ejecución.
- `workflows/`: propuestas, aclaraciones, estados y aprobaciones.
- `retrieval/`: chunks con provenance y consultas server-side.
- `data/`: `QueryPlan` cerrado para acceso determinista.
- `observability/`: eventos allowlisted sin contenido sensible.
