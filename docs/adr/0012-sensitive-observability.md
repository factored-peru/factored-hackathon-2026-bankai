# ADR 0012: Observabilidad sensible y telemetría GenAI

## Status

Accepted

## Evolución

La evaluación tiene contrato y criterios propios en ADR 0015. Esta ADR conserva
una sola responsabilidad: definir qué metadatos pueden cruzar la frontera de
telemetría, incluido cualquier resultado de evaluación.

Los documentos de observabilidad y CI/CD incorporados para la hackathon añaden
Langfuse Cloud US como visualizador OTel y exigen trazabilidad causal de la
decisión. Esa adición no relaja la prohibición de contenido: para este dominio,
la cadena causal se reconstruye con IDs pseudonimizados, versiones, estados y
métricas, nunca con prompts ni respuestas.

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

Los resultados de evaluación permitidos por ADR 0015 se registran solo como
métricas de baja cardinalidad y versiones; esta ADR no define ni modifica sus
criterios, fixtures o gates.

Cuando se configure Langfuse Cloud US, el backend usa un `TracerProvider`
aislado con spans creados manualmente desde el adaptador seguro. No se activa
un callback LangChain/LangGraph ni auto-instrumentación de proveedor, porque
pueden capturar contenido. El recurso, nombre de span, atributos y eventos se
validan contra una allowlist antes de exportar.

Langfuse Cloud US recibe esos spans por OTLP/HTTP desde el exportador estándar
de OpenTelemetry; no se usa el SDK de Langfuse ni su instrumentación, de modo
que la allowlist es el único punto de salida. La allowlist es un contrato
cerrado en `domain/observability/telemetry-attributes.ts`, común a spans,
atributos de métricas OTel, Langfuse y registros BigQuery: claves nombradas, un
catálogo cerrado de métricas de evaluación y valores con forma restringida
(identificadores, códigos snake_case, pseudónimos hexadecimales), de modo que
texto libre no pasa ni bajo una clave permitida. Las claves de contenido
(`prompt`, `sql`, `tenantId`, `traceId`, etc.) se rechazan por nombre, y el
error nombra la clave, nunca el valor. Los atributos de métricas OTel excluyen
IDs, hashes y fixtures; sólo los spans llevan el pseudónimo de correlación.

El destino es únicamente `https://us.cloud.langfuse.com`: la configuración no
ofrece un endpoint OTLP libre, el arranque valida el host y las credenciales
(`SVC-CORE-9017` a `9019`) y, con telemetría activa, rechaza cualquier variable
`OTEL_EXPORTER_OTLP_*` del entorno porque el exportador estándar la mezclaría en
cada petición. Antes de salir, un exportador de última compuerta descarta todo
span con nombre o atributos fuera del contrato, eventos, enlaces, mensaje de
estado libre o atributos de recurso inesperados; sólo los cuenta, sin
registrarlos.

El correlador de cada traza es un HMAC de su `trace_id` con una clave de
entorno; nunca el `trace_id` de entrada. Es el mismo valor en el span de
Langfuse y en la fila BigQuery, y rotar la clave corta la correlación histórica
a propósito.

La traza permitida preserva el orden causal, no el contenido:

```text
conversation -> session -> input/privacy -> model_armor -> primary_jev
  -> catalog -> specialized_jev -> policy -> retrieval_or_tool
  -> response/privacy -> durable_audit -> evaluation
```

Cada span puede contener resultado, clase de riesgo, versión de policy,
catálogo, modelo, template, latencia, contadores de tokens, intento y código
de error allowlisted. La correlación externa usa un pseudónimo HMAC rotado; el
`trace_id` de entrada, `session_id`, `user_id` y `tenant_id` crudos no cruzan
la frontera. P0 conserva exportación completa sólo para fixtures sintéticos;
la tasa de muestreo productiva y el presupuesto de unidades se configuran por
entorno antes de activar tráfico real.

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
- Una operación con efecto distinto de `none` requiere un span de permiso y
  auditoría durable previo a la ejecución. La ausencia de ese registro bloquea
  el efecto; un fallo del exportador externo no se convierte en permiso.

## Referencias

- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/)
- [Langfuse JS/TS observability SDK](https://langfuse.com/docs/observability/sdk/overview)
- [Langfuse data regions](https://langfuse.com/security/data-regions)
