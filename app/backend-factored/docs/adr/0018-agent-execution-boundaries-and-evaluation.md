# ADR 0018: Fronteras de ejecución y evaluación del agente

## Status

Accepted

## Context

Los ADR anteriores definen sesión, guardrails, policy, herramientas, HITL y
gobierno de proveedores, pero la secuencia ejecutable podía interpretarse de
formas distintas. En particular, una respuesta de Jev no debe habilitar una
tool, una aclaración no debe invocar el router y una respuesta con PII no debe
salir aunque el modelo haya terminado correctamente.

## Decision

El control plane implementará este orden obligatorio:

```text
session
  -> normalize and size-limit
  -> backend deterministic privacy firewall
  -> Model Armor latest minimized user message
  -> DecisionState
  -> Jev domain gate
  -> out_of_domain | clarification interrupt | LLM router
  -> router guardrail and schema
  -> deterministic policy
  -> RAG/tool route
  -> disclosure
  -> generation privacy
  -> generation
  -> replacement validation
  -> final guardrail
  -> response and safe audit
```

`out_of_domain` y `clarification` son ramas no privilegiadas. No invocan
router, RAG, base de datos ni generación. Una aclaración se procesa como nueva
entrada y vuelve a iniciar el boundary de entrada.

Jev devuelve una señal estructurada de dominio, ruta candidata y confianza.
Sus rutas son restrictivas y no constituyen autorización. La policy y el
executor son las únicas capas que pueden permitir una tool.

El estado persistido no contiene prompts crudos, PII, secretos, resultados
completos, cookies ni valores originales de reemplazos. Solo conserva
proyecciones mínimas, referencias opacas, hashes, versiones y estados.

Los fallos de sesión, guardrail, Jev, schema, policy, privacidad, tool o
reconciliación terminan en fallo cerrado, denegación, pausa explícita o estado
indeterminado. Nunca se usa un fallback permisivo.

El repositorio incluye `bun run agent:matrix -- --all`, una matriz sintética
determinista que valida estados y etapas sin API keys ni tráfico externo.

La matriz se presenta verticalmente por escenario para hacer visible la
transición de estado. Cada traza muestra, en este orden, entrada sintética,
sesión, normalización, firewall determinista del backend, guardrail, `DecisionState`, Jev, router,
schema, policy, recuperación o tool, disclosure, privacidad de generación,
reemplazo validado, guardrail final y respuesta.

La representación de guardrails conserva dos conceptos distintos:

```text
filter_match_state = NO_MATCH_FOUND | MATCH_FOUND
invocation_result  = SUCCESS | PARTIAL | FAILURE
```

Un `MATCH_FOUND` representa una detección; no equivale a una falla de
invocación. Un `FAILURE` o `PARTIAL` en una superficie que requiere
sanitización se muestra como fallo cerrado. La matriz no sustituye la
integración real de Model Armor.

Las ramas de aclaración y aprobación se imprimen como interrupciones y
persistencia simuladas. El `thread_id`, el checkpointer durable y el workflow
se representan por hashes o marcadores; la integración real requiere el
checkpointer PostgreSQL definido por el ADR 0017.

La vista humana puede mostrar texto de fixtures sintéticos para explicar la
transformación del prompt. La salida `--json` omite prompts crudos, PII,
resultados de tools, valores privados y handles completos, de acuerdo con el
ADR 0012.

## Consequences

- El orden es auditable y evita que un modelo convierta texto en autoridad.
- La frontera determinista de PII en el backend reduce el riesgo de enviar
  datos crudos a terceros.
- Los proveedores externos deben cumplir sus contratos de región, retención,
  logging y modalidad antes de habilitarse.
- La matriz simulada no sustituye pruebas de integración, calibración ni una
  evaluación legal o regulatoria por jurisdicción.

## References

- [Google Model Armor sanitize prompts and responses](https://docs.cloud.google.com/model-armor/sanitize-prompts-responses)
- [Google Model Armor SanitizationResult](https://docs.cloud.google.com/model-armor/reference/rest/v1/SanitizationResult)
- [LangGraph interrupts and durable execution](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph)
- [Jev SDK](https://jevtypesafe.org/docs/jev-sdk/)
- [Qdrant multitenancy and payload filters](https://qdrant.tech/documentation/tutorials/multiple-partitions/)
- [Redis GETDEL](https://redis.io/docs/latest/commands/getdel/)
- [Bun console and terminal color](https://bun.sh/docs/runtime/color)
- [OWASP Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
