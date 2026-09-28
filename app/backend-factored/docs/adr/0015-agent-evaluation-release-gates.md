# ADR 0015: Evaluación y gates de release del agente

## Status

Accepted

## Context

La calidad probabilística del modelo no equivale a la seguridad del sistema.
Los resultados de clasificación deben medirse separados de las invariantes de
seguridad y autorización.

## Decision

La evaluación se divide en seis suites:

```text
Security
Determinism
RAG
Policy
Tools
Recovery
```

Gates de tolerancia cero:

```text
cross-tenant leakage             = 0
unauthorized side effect         = 0
DENY → execution                 = 0
expired approval → execution     = 0
PII/secret in telemetry          = 0
unknown tool execution           = 0
```

Métricas probabilísticas reportadas aparte:

- intent accuracy;
- routing accuracy;
- retrieval recall;
- groundedness;
- false-positive y false-negative rate de guardrails;
- calibración de Jev/policy signals;
- p50/p95 latency, costo por workflow y escalamiento.

La suite de guardrails debe cubrir:

- PII bancaria detectada con custom infoTypes;
- redacción de credenciales y secretos;
- preservación controlada de los últimos cuatro dígitos autorizados;
- bloqueo de información financiera no autorizada;
- `FAILURE` de Model Armor sin liberar contenido;
- streaming sensible deshabilitado;
- diferencias entre `NO_MATCH_FOUND`, `MATCH_FOUND`, `FAILURE` y `SKIPPED`;
- comparación de SDP contra cualquier detector determinista del backend
  opcional; no se habilitan modelos de IA locales.

Un release se bloquea por cualquier fallo determinista. Las métricas
probabilísticas requieren dataset versionado, umbrales definidos antes de la
ejecución y comparación contra la versión anterior.

## Consequences

- La demo puede mostrar propiedades de seguridad verificables, no solo una
  métrica de “accuracy” del modelo.
- Cada nueva tool, policy, modelo, guardrail o cambio de prompt requiere una
  regresión relevante.
- Los fixtures deben ser sintéticos y no contener datos bancarios reales.

## Referencias

- [OWASP LLM06: Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
- [OpenTelemetry GenAI semantic conventions](https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/)
