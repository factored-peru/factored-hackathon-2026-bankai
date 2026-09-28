# ADR 0007: Ejecución durable del agente y HITL

## Status

Accepted

## Context

El agente debe poder pausar para aprobación humana y reanudar sin duplicar
efectos. LangGraph persiste el estado y reanuda desde el nodo interrumpido; por
eso un nodo puede volver a ejecutar código anterior a `interrupt()`.

## Decision

El workflow usará un checkpointer durable y dividirá las operaciones en nodos
pequeños con límites claros:

```text
propose
  → persist proposal
  → interrupt
  → human approval
  → re-authenticate and re-authorize
  → execute idempotently
  → reconcile
```

Se prohíbe ejecutar efectos laterales antes de `interrupt()`. Cada workflow
persistirá:

```ts
type WorkflowIdentity = {
  workflowId: string;
  threadId: string;
  userId: string;
  tenantId: string;
  sessionVersion: number;
};

type Approval = {
  approvalId: string;
  workflowId: string;
  actionHash: string;
  policyVersion: string;
  sessionVersion: number;
  expiresAt: string;
  consumedAt?: string;
};
```

Invariantes:

1. `threadId` no es una credencial.
2. Reanudar exige sesión válida y autorización actual.
3. Los efectos laterales son idempotentes.
4. Una aprobación es una autorización puntual, no permanente.
5. Una aprobación consumida, expirada o asociada a una sesión revocada no puede
   reutilizarse.

## Consequences

- Se necesita persistencia durable y una clave estable de workflow.
- Un nodo pequeño facilita retries, checkpoints y recuperación.
- Una desconexión del cliente no cancela automáticamente el workflow.
- Las compensaciones y estados indeterminados deben quedar explícitos.

## Referencias

- [LangGraph: Thinking in LangGraph](https://docs.langchain.com/oss/javascript/langgraph/thinking-in-langgraph)
- [LangGraph interrupts](https://langchain-ai.github.io/langgraph/concepts/breakpoints/)
