# Evaluación P0 saneada

La evaluación usa TypeScript propio conforme ADR 0015. El comando
`bun run eval:run` ejecuta 48 fixtures base y cinco extensiones sintéticas para
los casos KG C1–C5. El resultado contiene sólo IDs de fixture, métricas,
versiones, scores y reason codes allowlisted.

No usa DeepEval, LangSmith, Promptfoo, AgentEvals ni un contenedor adicional.
OpenTelemetry recibe sólo atributos de baja cardinalidad; la persistencia
BigQuery será un adaptador posterior a esta frontera y no una exportación de
contenido.

Los scores son informativos. Una tasa de fallo no bloquea el release P0: sólo
un fixture inválido o un error técnico lo hace. Convertir umbrales en gates
requiere una línea base humana y una ADR nueva.

La comparación local baseline vs control plane (`bun run eval:compare`) está
documentada en [`eval-ab-local.md`](./eval-ab-local.md): corpus 128 es/pt,
modos `--baseline auto|vertex|synthetic` y corrida de referencia con Vertex.
