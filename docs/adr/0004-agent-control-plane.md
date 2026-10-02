# ADR 0004: Control plane bancario con fronteras deterministas

## Status

Accepted

## Context

El asistente combina conversación, datos bancarios estructurados, evidencia de
grafo y posibles acciones. El modelo no puede ser una frontera de autorización
ni elegir consultas o efectos libremente.

## Decision

El control plane online se ejecuta en `app/backend/` con Bun, TypeScript,
Fastify, Zod y LangGraph.js. Su secuencia normativa es:

```text
Firebase ID token -> SessionManager -> normalización y privacidad
-> Model Armor -> JEV -> policy determinista -> ruta autorizada
-> evidencia/tool -> validación de salida -> Model Armor -> respuesta
```

- Firebase Auth aporta identidad; el backend resuelve tenant, rol y
  capacidades. El prompt nunca aporta esa autoridad.
- JEV clasifica dominio, riesgo y ruta candidata; no autoriza ni ejecuta.
- El Policy Engine permite, aclara, rechaza o escala. Las transiciones de caso
  y HITL se guardan en Firestore; SessionManager usa Memorystore for Valkey
  solo para estado efímero.
- Structured RAG usa únicamente templates BigQuery cerrados y parametrizados.
  KG-RAG usa operaciones cerradas sobre un artefacto de grafo versionado en GCS.
- El LLM solo interpreta parámetros y redacta una respuesta fundamentada. No
  recibe credenciales, `sessionId`, handles, SQL libre ni operaciones de grafo
  libres.

## Consequences

El backend mantiene un único control plane auditable y TypeScript es el único
runtime online. El pipeline Python publica evidencia y grafo, pero nunca
participa en una solicitud del usuario.
