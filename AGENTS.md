# AGENTS

Este repositorio se organiza por capa y cada cambio debe respetar el límite de
propiedad de su directorio.

## Mapa del repositorio

- `app/backend/`: API y control plane online con Bun, TypeScript, Fastify,
  Zod y LangGraph.js. Sus reglas locales viven en `app/backend/AGENTS.md`.
- `app/frontend/`: experiencia cliente y backoffice con Next.js, React,
  Tailwind CSS y Firebase Auth.
- `data-ingestion-and-processing/`: proceso offline Python 3.12 para
  transferencia, preparación, KDD, Naive Bayes y compilación del grafo.
- `deploy/`: Terraform, configuración local y runbooks de despliegue.
- `docs/`: decisiones, arquitectura, investigación y planificación.

## Reglas transversales

- No mezcles código Python offline en el backend ni lógica de negocio online
  dentro del pipeline.
- Los contratos públicos se cambian primero en su especificación y se prueban
  desde la capa propietaria.
- BigQuery es fuente estructurada canónica; GCS contiene artefactos versionados
  del pipeline; Firestore es durable; Memorystore for Valkey es efímero.
- No edites documentos bajo `docs/planning/to-adopt/` para convertirlos en
  fuente normativa: son trazabilidad y referencia. Las decisiones vigentes
  viven en `docs/adr/`.
- No guardes secretos, PII cruda, cookies, handles ni artefactos generados en
  Git. Ejecuta las validaciones de la capa afectada antes de cerrar un cambio.
