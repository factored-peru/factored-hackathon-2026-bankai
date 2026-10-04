# scripts

Automatizacion local para mantener el contrato como fuente de verdad.

- `bun run spec:check`: valida reglas SDD sobre `specs/openapi.json`.
- `validate-openapi.ts`: implementacion del validador de contrato.
- `bun run env:prune-empty`: elimina de `app/backend/.env` sólo las
  asignaciones sin ningún carácter tras `=` y las asignaciones no vacías que
  una ocurrencia posterior de la misma variable sustituye; muestra sólo nombres
  eliminados, nunca valores. Debe ejecutarse desde `app/backend/`.

## Prueba de humo de Model Armor

`bun run model-armor:smoke` llama a la API real de Model Armor mediante ADC
(`gcloud auth application-default login`); no usa API keys. Requiere
`MODEL_ARMOR_ENABLED=true`, `MODEL_ARMOR_PROJECT_ID`, `MODEL_ARMOR_LOCATION` y
`MODEL_ARMOR_INSPECT_TEMPLATE` en el entorno de la sesión, nunca en archivos.
Ejecuta cinco casos (texto limpio, prompt injection, tarjeta sintética,
respuesta limpia y template inexistente que debe fallar cerrado) e imprime solo
veredictos, no contenido. Sale con código 1 si algún caso no coincide. Es una
comprobación manual contra cloud, no forma parte de `bun test`.

## Matriz de comportamiento

`bun run agent:matrix -- --all` ejecuta fixtures sintéticos de la cadena del
control plane y muestra cada escenario verticalmente. La salida explica el
prompt de entrada, la sesión server-side, la desidentificación, los verdicts
de guardrail, Jev, router, policy, recuperación, resolución de handles,
disclosure, generación, reemplazo y respuesta.

```bash
bun run agent:matrix -- --all
bun run agent:matrix -- --scenario authorized-database
bun run agent:matrix -- --scenario direct-prompt-injection --plain
bun run agent:matrix -- --json
```

La matriz no llama proveedores externos ni usa API keys. Los escenarios
marcan explícitamente cuando un workflow, checkpointer, Jev o Model Armor es
un fixture local. La salida humana puede mostrar contenido sintético para
explicar la transformación; `--json` omite prompts, valores privados y
handles completos. `--plain` y `NO_COLOR=1` desactivan colores ANSI.
