# ADR 0011: Confianza del RAG y aislamiento por tenant

## Status

Accepted

## Context

Los documentos recuperados son datos no confiables: pueden contener prompt
injection, instrucciones falsas o información de otro tenant. El modelo no
puede elegir el tenant ni enviar filtros arbitrarios a Qdrant.

## Decision

El retrieval será server-side:

```text
query del usuario
  → tenant desde SessionContext
  → filtro Qdrant inyectado por backend
  → retrieval limitado
  → validación de provenance y clasificación
  → Model Armor
  → rerank
  → contexto separado de instrucciones
```

Cada punto/documento debe incluir:

```text
tenant_id
document_id
source_id
source_type
document_version
classification
created_at
content_hash
```

El cliente y el LLM no pueden establecer `tenant_id`, collection, shard,
filters ni source allowlists. Las ACL se aplican antes y después del retrieval.
Para colecciones compartidas se usa payload filter y `is_tenant=true`; shards
dedicados se reservan para tenants que requieran aislamiento físico o escala
propia.

## Consequences

- El retrieval es más seguro, pero requiere que el backend mantenga el contexto
  de sesión en todo el workflow.
- La provenance se convierte en dato obligatorio de auditoría.
- Documentos sin metadata válida no entran al prompt.

## Referencias

- [Qdrant multitenancy](https://qdrant.tech/documentation/tutorials/multiple-partitions/)
- [OWASP RAG Security](https://cheatsheetseries.owasp.org/cheatsheets/RAG_Security_Cheat_Sheet.html)
