# Roadmap de API del backend

La evolución del backend conserva `specs/openapi.json` como contrato canónico.

## P0

- Health, autenticación Firebase y SessionManager server-side.
- Conversación controlada, estados de caso y escalamiento HITL.
- Structured RAG con `QueryPlan` BigQuery y `EvidenceDTO`.
- KG-RAG con operación cerrada y artefacto GCS validado.

## Reglas de contrato

- El navegador nunca envía tenant, rol, SQL, nombre de tabla, query de grafo ni
  handles privados como autoridad.
- Las respuestas de recuperación incluyen evidencia y provenance saneados.
- Todo cambio público empieza en OpenAPI, tiene `operationId`, errores RFC 9457
  y pruebas de contrato.

Voz y documentos pertenecen a P1 y no cambian las fronteras descritas en
`../../../docs/adr/`.
