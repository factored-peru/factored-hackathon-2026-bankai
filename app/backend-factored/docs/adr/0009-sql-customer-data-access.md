# ADR 0009: Acceso SQL y datos de clientes

## Status

Accepted

## Context

El agente puede consultar movimientos, pero SQL libre generado por un LLM
amplía innecesariamente la superficie de datos, permisos y costo.

## Decision

El modo normal será:

```text
intent
  → QueryPlan tipado
  → validador de campos, filtros y límites
  → compilador determinista
  → SQL parametrizado
  → conexión de solo lectura
```

El `QueryPlan` solo puede usar operaciones, tablas, columnas, ordenamientos y
rangos allowlisted. No se aceptan DDL, DML, múltiples sentencias, funciones no
permitidas ni identificadores provenientes directamente del prompt.

Text-to-SQL libre queda deshabilitado. Si se habilita experimentalmente,
requiere un ADR posterior y debe pasar por parser AST, allowlist estricta,
`LIMIT`, `statement_timeout` y reconstrucción segura.

El rol de agente debe ser `NOSUPERUSER`, `NOBYPASSRLS`, sin escritura y sin
acceso a tablas fuera del catálogo. Las tablas protegidas usan RLS y
`FORCE ROW LEVEL SECURITY` cuando el owner podría evadirla.

## Consequences

- Se reduce la expresividad de consultas en favor de seguridad y auditabilidad.
- Las consultas nuevas requieren ampliar el compilador y sus pruebas.
- Las políticas RLS no sustituyen el filtro server-side por tenant.
- Los resultados se minimizan antes de entrar al contexto del agente.

## Referencias

- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/17/ddl-rowsecurity.html)
- [PostgreSQL Role Attributes](https://www.postgresql.org/docs/17/role-attributes.html)
