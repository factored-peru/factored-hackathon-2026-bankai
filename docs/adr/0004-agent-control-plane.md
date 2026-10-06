# ADR 0004: Control plane bancario con fronteras deterministas

## Status

Accepted

## Evolución

La decisión incorpora la evaluación de robustez de JevAdvBench: una salida
tipada no vuelve confiable al contenido que alimenta la decisión. Los textos de
usuario, la memoria conversacional y cualquier recuperación se tratan como
estado no confiable, aun cuando hayan pasado una validación estructural.

## Context

Dispute Transaction Support combina conversación, evidencia estructurada de
transacciones y disputas, y escalamiento humano simulado. El modelo no puede
ser una frontera de autorización ni elegir consultas o efectos libremente.

## Decision

El control plane online se ejecuta en `app/backend/` con Bun, TypeScript,
Fastify, Zod y un `StateGraph` de LangGraph.js. Su secuencia normativa es:

```text
sesión -> normalización/privacidad -> Model Armor -> JEV primario
  llm -> policy -> respuesta
  database -> catálogo Structured -> JEV Structured -> policy -> Structured RAG
  relations -> catálogo KG -> JEV KG -> policy -> KG-RAG
  ood -> policy -> respuesta segura
```

- Firebase Auth aporta identidad; el backend resuelve tenant, rol y
  capacidades. El prompt nunca aporta esa autoridad.
- El JEV primario solo elige `llm`, `database`, `relations` u `ood`; no
  autoriza ni ejecuta. Ambigüedad o baja confianza pasan a aclaración.
  Fraude activo, cargo no reconocido **formal**, pedido de humano/ombuds y
  demás casos `escalate_hitl` del mapa de producto **no son** `ood`: permanecen
  in-domain y se escalan.
- Outcomes de turno del control plane (cajones excluyentes tras el gate):
  `answerable` (lectura/explicación con evidencia ALLOW), `escalate_hitl`
  (capability `escalation.request` → Policy `REQUIRE_APPROVAL`), `ood_refuse`
  (fuera de dominio o abuso con respuesta segura), o aclaración durable.
  Consulta de movimientos/descriptor = `answerable`; “quiero reclamar” /
  “no autorizo” / reclamo formal = `escalate_hitl`.
- Si `DecisionSignal.requiresEscalation === true` con dominio `in_domain`, el
  control plane **sintetiza** la herramienta cerrada `escalation.request` y
  salta el model router; la autorización sigue en Policy. El flag no autoriza
  por sí mismo: Policy decide `REQUIRE_APPROVAL` o DENY según la matrix.
- Antes de todo JEV, el backend construye una proyección de decisión tipada y
  mínima: identidad, tenant, rol, capacidades, clasificación de riesgo y las
  claves de catálogo provienen de código o sesión autenticada. El texto de
  usuario desidentificado sólo se presenta como dato a clasificar; no puede
  añadir instrucciones, criterio, autoridad, opciones, permisos ni hechos de
  caso. Memoria y contenido recuperado no se usan como estado para decidir
  rutas o autorizaciones.
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
- El primer flujo operativo sólo consulta evidencia autorizada y solicita un
  escalamiento mock sujeto a aprobación de operador. Presentar, cancelar o
  modificar una disputa bancaria es una capacidad DENY y no tiene herramienta.
- Las pruebas de JEV comparan cada decisión con una ejecución limpia y un
  rerun idéntico. Las variantes de una sola edición para rewording, opinión,
  instrucción, autoridad, contenido indirecto y estructura sólo usan fixtures
  sintéticos. El proveedor real es opt-in para ejecución manual o nocturna;
  nunca forma parte de un PR ni autoriza una acción.

El baseline comparativo `CHAT_PIPELINE=baseline` está fuera de este control
plane, no lo sustituye ni cambia su secuencia normativa. Es un
`ConversationRunner` aislado, habilitado sólo por configuración del proceso y
con opt-in adicional. Para poder comparar chat factual mínimo, recibe texto,
DDL estático y un tool nativo que ejecuta hasta dos `QueryPlan` de ejemplo. El
backend inyecta la identidad del actor demo y conserva límites del plan; el
modelo no compone SQL ni selecciona cliente. Las filas sí llegan al modelo y
por ello el alcance se limita a tráfico/datos sintéticos o previamente
aprobados para medición. Por diseño omite privacidad, Model Armor, JEV, policy,
filtro por rol, evidencia y `StateGraph`. Su existencia no autoriza una ruta
bancaria factual, de recuperación o de acciones sin las fronteras de esta ADR.

## Consequences

El backend mantiene un único control plane auditable y TypeScript es el único
runtime online. El pipeline Python publica evidencia y grafo, pero nunca
participa en una solicitud del usuario.
