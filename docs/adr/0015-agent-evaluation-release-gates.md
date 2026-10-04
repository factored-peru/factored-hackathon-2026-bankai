# ADR 0015: Evaluación TypeScript y gates de release

## Status

Accepted

## Evolución

La decisión se consolidó para reemplazar gates prematuros y frameworks
adicionales por una evaluación P0 determinista, sintética y saneada. El cambio
responde a que no existe corpus aprobado ni proveedor de judge habilitado: la
calidad se observa primero y solo se convierte en bloqueo tras una línea base
revisada por humanos.

La evolución actual fija CI de PR con pruebas deterministas y agrega una
ejecución nocturna/manual opt-in contra JEV con fixtures sintéticos. Langfuse
Cloud US visualiza trazas y scores saneados vía ADR 0012, pero no reemplaza los
evaluadores TypeScript ni define gates.

## Context

Las pruebas unitarias no bastan para validar una trayectoria agentic correcta,
segura y recuperable. La evaluación debe medir rutas, componentes y resultados
sin transportar contenido sensible a la telemetría ni depender de una
plataforma adicional.

## Decision

Las suites de evaluación viven y se ejecutan en TypeScript dentro del entorno
del backend. Cada caso usa un `EvaluationContext` minimizado y cada métrica
emite un `EvaluationResult` con:

```text
metric, score [0..1], passed, label, reasonCode allowlisted,
evaluator, evaluatorVersion, mode
```

El contexto, la telemetría y el resultado no contienen prompts, respuestas,
argumentos, filas, evidencia textual, PII, secretos, cookies ni handles. Solo
persisten IDs de fixtures y versiones de policy, catálogo y evidencia.

La matriz obligatoria tiene tres capas:

| Capa | Criterio determinista | Judge opcional |
| --- | --- | --- |
| Trayectoria | ruta, orden de nodos, policy antes de ejecución, catálogo KG antes de su JEV y ausencia de vector-RAG | completitud acotada con JEV |
| Componente | schema, tenant, presupuesto, guardrail, catálogo, checksum, provenance y resultado verificado | routing o confianza con JEV |
| End-to-end | normal, aclaración, HITL, OOD, ES/PT, fallos y safe fallback | claridad, relevancia o groundedness con LLM saneado |

JEV-as-judge es el primer judge permitido para decisiones acotadas. LLM-as-judge
es opcional, solo recibe fixtures sintéticos o contenido saneado y nunca
autoriza una acción. Ambos son puertos; P0 usa dobles deterministas hasta que
exista proveedor aprobado.

El golden set P0 contiene 48 fixtures sintéticos versionados: 12 rutas
primarias, 8 de aclaración/policy/HITL, 10 Structured RAG, 10 KG-RAG y 8 de
seguridad/resiliencia. El runner produce un reporte saneado por fixture. Todos
los scores P0 son `informational`: el runner falla solo ante fixture o contrato
inválido, o ante error técnico. Activar thresholds bloqueantes requiere nueva
ADR y una línea base revisada por humanos.

La CI de cada PR bloquea cambios si fallan contrato OpenAPI, pruebas Bun,
tipos, Biome, pruebas Python o la matriz determinista. Sus artefactos sólo
contienen resumen, versiones y reason codes allowlisted. No necesita secretos
ni proveedores. Un workflow nocturno o manual, protegido por entorno, puede
ejecutar la batería JEV contra un proveedor configurado: parte de una ejecución
limpia, realiza un rerun idéntico y compara variantes sintéticas de una sola
edición contra el ruido de rerun. Informa flip, drift y cruces de confianza,
pero no bloquea PR ni despliegue hasta que exista baseline humana.

OpenTelemetry emite únicamente atributos saneados de métricas; Langfuse Cloud
US puede recibirlos bajo ADR 0012 y BigQuery conserva resultados versionados
cuando exista su adaptador. No se instala ni levanta Docker de evaluación, ni
se instalan o configuran LangSmith, DeepEval, Promptfoo, AgentEvals o
DeepAgents en P0.

El comparador `baseline` se evalúa como trayectoria `llm` separada. No se le
aplican los criterios de aprobación del control plane: su evaluador determina
que las compuertas fueron omitidas, que la llamada terminó y que se registró
duración e intentos/éxitos de recuperación. `BaselineRunMeasurement` y los campos opcionales de
`EvaluationContext` guardan sólo pipeline, duración, conteo de llamadas,
resultado/error allowlisted y banderas de compuertas; nunca contenido. La
comparación posterior puede medir completitud, tiempo, fallos y leaks sobre
fixtures sintéticos mediante evaluadores/judges aprobados, sin convertir al
baseline en una vía de release ni de acceso a datos.

| Referencia | Patrón adoptado | Exclusión P0 |
| --- | --- | --- |
| OpenTelemetry | spans y atributos de métricas de baja cardinalidad | contenido o exportador de contenido |
| BigQuery | resultado de evaluación saneado y versionado | datos crudos o evidencia textual |
| AgentEvals | comparación determinista, ordenada y estricta de trayectoria | paquete, mensajes de proveedor o LLM judge |
| DeepEval | capas de componente, trayectoria y end-to-end | paquete, tracing administrado y thresholds del proveedor |
| Promptfoo | golden set, assertions propias y regresión CI | paquete, YAML, UI, servidor, Docker y red-team |
| JEV / TypeSafe | judge acotado detrás de `JudgeEvaluator` | SDK, API key, autorización o ejecución |
| LangSmith / DeepAgents | ninguno | SDK, tracing, almacenamiento, control plane o loop agentic |
| Langfuse Cloud US | visualización OTel de metadata allowlisted | prompts, respuestas, datasets reales, evaluación decisoria o autorización |

Si en el futuro una batería end-to-end amplia, comparación de proveedores o
red-team exige Promptfoo, se ejecutará como job efímero de CI con Node 24 y
versión fijada; no se desplegará su UI ni se añadirá a Compose.

## Consequences

Los evaluadores base y específicos de cada RAG se pueden extender sin acoplar
la política de release a un proveedor. Los datos reales no son necesarios para
validar contrato, seguridad ni trayectoria inicial.

## Referencias

- `../planning/to-adopt/good-evals.md`
- `../planning/to-adopt/AI Agent Engineering - Making AI Agents Observable, Monitorable, and Production-Ready [Tutorial + Code].pdf`
- `../planning/to-adopt/CD Pipelines [Tutorial With Code].pdf`
- `../planning/to-adopt/prompt injection jev.pdf`
- https://opentelemetry.io/docs/specs/semconv/registry/attributes/gen-ai/
