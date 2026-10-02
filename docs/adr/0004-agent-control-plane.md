# ADR 0004: Control plane bancario con fronteras deterministas

## Status

Accepted

## Evolución

La decisión se precisó para expresar las rutas reales del `StateGraph` y el
orden de sus gates. La formulación anterior dejaba la ruta autorizada genérica;
la actual elimina esa ambigüedad porque el routing y la policy deben ser
auditables antes de invocar recuperación o un modelo.

## Context

El asistente combina conversación, datos bancarios estructurados, evidencia de
grafo y posibles acciones. El modelo no puede ser una frontera de autorización
ni elegir consultas o efectos libremente.

## Decision

El control plane online se ejecuta en `app/backend/` con Bun, TypeScript,
Fastify, Zod y un `StateGraph` de LangGraph.js. Su secuencia normativa es:

```text
sesión -> normalización/privacidad -> Model Armor -> JEV primario
  llm -> policy -> respuesta
  database -> catálogo Structured -> JEV Structured -> policy -> Structured RAG
  relations -> catálogo KG -> JEV KG -> policy -> KG-RAG
  ood -> respuesta segura
```

- Firebase Auth aporta identidad; el backend resuelve tenant, rol y
  capacidades. El prompt nunca aporta esa autoridad.
- El JEV primario solo elige `llm`, `database`, `relations` u `ood`; no
  autoriza ni ejecuta. Ambigüedad o baja confianza pasan a policy y aclaración.
- El Policy Engine permite, aclara, rechaza o escala. Las transiciones de caso
  y HITL se guardan en Firestore; SessionManager usa Memorystore for Valkey
  solo para estado efímero.
- Las rutas de recuperación siguen el contrato cerrado de ADR 0011. El control
  plane no omite catálogo, JEV especializado ni policy.
- El LLM solo interpreta parámetros y redacta una respuesta fundamentada. No
  recibe credenciales, `sessionId`, handles, SQL libre ni operaciones de grafo
  libres.
- No existe vector-RAG, vector store ni fallback factual a LLM. ReAct no está
  activo; queda como `TODO` decidir entre el patrón preconstruido de LangGraph
  y un loop propio, siempre acotado por policy.

## Consequences

El backend mantiene un único control plane auditable y TypeScript es el único
runtime online. El pipeline Python publica evidencia y grafo, pero nunca
participa en una solicitud del usuario.
