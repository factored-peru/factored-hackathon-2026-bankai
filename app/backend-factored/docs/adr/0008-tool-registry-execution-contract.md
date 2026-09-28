# ADR 0008: Registro de herramientas y contrato de ejecución

## Status

Accepted

## Context

Las herramientas son la frontera entre la salida probabilística y los efectos
del sistema. El LLM no debe descubrir funciones, permisos ni endpoints por su
cuenta.

## Decision

Todo tool call pasa por un registry versionado y por complete mediation:

```text
LLM propone
  → registry valida existencia y versión
  → schema valida entrada
  → policy valida capability, riesgo y sesión
  → executor autorizado ejecuta
```

El contrato conceptual es:

```ts
type ToolDefinition = {
  id: string;
  version: string;
  capability: string;
  sideEffect: "none" | "reversible" | "irreversible";
  risk: "low" | "medium" | "high" | "critical";
  idempotency: "none" | "required";
  timeoutMs: number;
  approval: "never" | "policy" | "always";
  inputSchema: unknown;
  outputSchema: unknown;
};
```

- El registry es allowlist; no hay nombres dinámicos ni funciones arbitrarias.
- Se rechazan campos extra y argumentos ocultos.
- El resultado también se valida contra schema.
- Herramientas irreversibles requieren aprobación explícita o están bloqueadas.
- El executor recibe contexto de sesión y tenant, pero el LLM nunca recibe
  credenciales.
- Los efectos laterales requieren idempotency key y timeout.

## Consequences

La funcionalidad, permisos y autonomía del agente quedan limitados por código y
política, no por instrucciones del prompt. Agregar una herramienta requiere
registry, schemas, política, pruebas y documentación.

## Referencias

- [OWASP LLM06: Excessive Agency](https://genai.owasp.org/llmrisk/llm062025-excessive-agency/)
