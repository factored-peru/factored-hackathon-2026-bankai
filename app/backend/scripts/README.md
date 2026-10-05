# scripts

Automatizacion local para mantener el contrato como fuente de verdad.

- `bun run spec:check`: valida reglas SDD sobre `specs/openapi.json`.
- `validate-openapi.ts`: implementacion del validador de contrato.
- `publish-image.sh`: construye la imagen Docker del backend; `--build-local`
  (default) o `--push` a Artifact Registry (imprime digest). Requiere
  `GCP_PROJECT_ID` / `GCP_REGION` para push. Ver
  [`deploy/docs/image-digests.md`](../../../deploy/docs/image-digests.md).
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

## Prueba local de Structured RAG

`bun run structured:try -- --question "..."` (`structured-rag-try.ts`) recorre
el camino real: el JEV de TypeSafe elige una entrada del catálogo, Vertex AI
interpreta sus parámetros y el backend los valida y liga. Imprime la decisión
del selector y, por defecto, los valores que **se ejecutarían**, sin tocar
BigQuery. Opciones: `--customer <id>` (cliente vinculado a la sesión local),
`--role` (por defecto `customer`), `--execute` (corre la consulta real; exige
`--customer` y `BIGQUERY_ENABLED=true`) y `--show-rows` (imprime los valores
devueltos; sin ella solo muestra conteos y columnas) y `--debug` (si el selector
falla, imprime el error del proveedor para distinguir el JEV, con mensajes
`jev_*`, de Vertex; es solo una ayuda local y el backend nunca registra esos
mensajes).

La pregunta se envía a TypeSafe y a Vertex AI, que según el ADR 0010 no deben
recibir datos personales: usa solo texto sintético. Requiere autorización
explícita, `JEV_ENABLED` y `VERTEX_AI_ENABLED` con su configuración, y credenciales
ADC. Si falta algo, se niega a ejecutar sin enviar nada.

## Dry run del catálogo de Structured RAG

`bun run catalog:dry-run` (`structured-catalog-dry-run.ts`) valida cada entrada
del catálogo contra las tablas reales con un dry run de BigQuery: el servicio
planifica la consulta e informa esquema y bytes estimados, sin leer filas ni
facturar. Por entrada imprime `OK` o `FAIL` con la regla que falló, el estimado
de bytes y el tope; nunca imprime SQL ni datos. Sale con código 1 si alguna
entrada falla o si el catálogo es inválido.

Alcanza BigQuery, así que requiere autorización explícita y credenciales ADC.
Sin `BIGQUERY_ENABLED=true` se niega a ejecutar. Configuración necesaria:
`GOOGLE_CLOUD_PROJECT`, `GOOGLE_CLOUD_LOCATION` (región del dataset),
`BIGQUERY_DATASET` y `STRUCTURED_CATALOG_PATH`.

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
