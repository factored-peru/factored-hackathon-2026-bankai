# ADR 0013: Presupuestos de recursos del agente

## Status

Accepted

## Context

Retries, loops, retrieval y tool calls pueden provocar agotamiento de tokens,
latencia o costo impredecible aunque cada dependencia tenga timeout propio.

## Decision

Cada workflow inicia con un presupuesto explícito:

```ts
type AgentBudget = {
  maxSteps: 12;
  maxToolCalls: 6;
  maxLLMCalls: 8;
  maxRetriesPerNode: 2;
  maxWallTimeMs: 30_000;
  maxRetrievedChunks: 8;
  maxInputTokens: number;
  maxOutputTokens: number;
};
```

Los límites de tokens son configuración por modelo; los límites estructurales
anteriores son defaults del MVP. Exceder un límite termina el workflow con
estado observable y sin fallback permisivo. Los reintentos cuentan contra el
presupuesto y nunca elevan permisos ni riesgo.

## Consequences

- El agente es resistente a loops y ataques de costo.
- Workflows que necesiten más recursos deben declarar un perfil distinto y una
  política explícita.
- Se miden consumo, costo, latencia, ratio de retries y motivo de terminación.

## Referencias

- [OWASP LLM06: Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
