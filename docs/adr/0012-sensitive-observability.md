# ADR 0012: Observabilidad sensible y telemetría GenAI

## Status

Accepted

## Context

OpenTelemetry define atributos GenAI que pueden contener prompts, mensajes,
tool arguments y resultados. Usarlos sin control convertiría la telemetría en
un canal de exfiltración.

## Decision

```text
OTel metadata = enabled
OTel content = disabled by default
```

Se puede registrar:

- modelo y proveedor;
- latencia y contadores de tokens;
- nombres/versiones de tools, sin argumentos;
- `trace_id`, `workflow_id`, `decision_id`, `policy_id`;
- clase de riesgo, guardrail verdict y status;
- `filter_match_state`, `invocation_result` y template version, sin findings ni
  valores detectados;
- hashes/pseudónimos de sesión y tenant.

No se registra:

- prompts completos o respuestas completas;
- chunks RAG, filas SQL, argumentos o resultados de tools;
- cookies, session IDs, handles completos, cuentas, credenciales o PII.

El logging de Model Armor se configura con el mismo criterio. Cualquier
excepción de contenido requiere redacción, allowlist de campos, retención
limitada y aprobación de seguridad.

Los estados de guardrail deben distinguir al menos `NO_MATCH_FOUND`,
`MATCH_FOUND`, `FAILURE` y `SKIPPED`. Un `FAILURE` o `SKIPPED` en un flujo que
requiere sanitización sensible no se registra como `ALLOW`.

## Consequences

- El debugging usa IDs, hashes y snapshots sintéticos, no datos reales.
- La excepción de visualización existe únicamente en la CLI local
  `agent:matrix`: sus prompts son fixtures sintéticos embebidos y la salida se
  rotula como tal. Esa salida no es telemetría ni auditoría productiva. Su
  modo `--json` mantiene la política minimizada y no incluye prompts crudos,
  PII, resultados completos, valores privados ni handles completos.
- Las métricas pueden agregarse por proveedor, riesgo, tool y resultado sin
  exportar contenido.
- La instrumentación debe probarse como parte de la suite de privacidad.

## Referencias

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/)
