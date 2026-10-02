# ADR 0020: Refinamiento de control plane, RAG y evaluación

## Status

Accepted

## Context

El MVP no cuenta con un corpus aprobado para recuperación vectorial. Además,
`docs/planning/evals.md` es la norma superior para evaluación y evita duplicar
OpenTelemetry + BigQuery con plataformas adicionales.

## Decision

Firebase App Hosting es el único hosting del frontend Next.js; Vercel no es una
ruta soportada. El control plane usa un `StateGraph` explícito:

```text
sesión -> normalización/privacidad -> Model Armor -> JEV primario
  llm -> policy -> respuesta
  database -> catálogo Structured -> JEV Structured -> policy -> Structured RAG
  relations -> catálogo KG -> JEV KG -> policy -> KG-RAG
  ood -> respuesta segura
```

El JEV primario solo elige `llm`, `database`, `relations` u `ood`. Ambigüedad y
baja confianza se resuelven mediante policy y aclaración. Los catálogos son
versionados, cerrados y se cargan antes de su JEV especializado; KG-RAG debe
cargar su catálogo antes de invocar el suyo. Structured RAG y KG-RAG fallan
cerrados mientras sus adaptadores BigQuery/GCS no estén conectados.

No hay vector-RAG, vector store ni fallback factual a LLM. ReAct no está activo:
queda como `TODO` decidir entre el patrón preconstruido de LangGraph y un loop
propio, siempre acotado por policy.

La evaluación P0 usa evaluadores TypeScript deterministas, JEV-as-judge cuando
aplique, OpenTelemetry sin contenido y BigQuery para resultados saneados. No se
instalan ni configuran LangSmith, DeepEval, Promptfoo o DeepAgents. Los
evaluadores de Structured RAG y KG-RAG extienden la evaluación base con sus
invariantes de catálogo, evidencia y provenance.

Esta ADR suplanta las secciones de routing/RAG de ADR 0004 y 0011, y las
decisiones de evaluación de ADR 0012, 0015 y 0018.

## Consequences

No se incorporan credenciales ni variables para plataformas de evaluación no
aprobadas. La instrumentación registra solo scores, labels, versiones, rutas,
latencia y costo; nunca prompts, filas, evidencia ni respuestas.

## References

- https://jillanisofttech.medium.com/the-evolution-of-rag-a-comprehensive-guide-to-modern-retrieval-augmented-generation-approaches-5b981af06a7e
- https://langchain-ai.github.io/langgraphjs/reference/classes/langgraph.StateGraph.html
- `../planning/evals.md`
