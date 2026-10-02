# AGENTS

Reglas estrictas para agentes que modifiquen esta base Bun/TypeScript.

## Antes de cambiar codigo

- Lee `README.md` —incluida su **Guía de invocación**—, `docs/sdd.md`,
  `docs/solid.md`, `docs/errors.md` y la
  carpeta relacionada al cambio.
- Si el cambio usa Bun, TypeScript, Fastify, Zod, Biome, Firebase, Google Cloud
  u otro recurso
  externo, revisa su documentacion oficial o primaria antes de implementar y
  aplica el patron recomendado para este repo.
- Declara supuestos concretos si la instruccion del usuario es ambigua. En modo
  plan, indica que el usuario puede corregir esos supuestos; en una prompt
  puntual, indica que puede detenerte o corregirte.

## Estructura y diseño

- No rompas la estructura por capas: `src/http` transporte, `src/config`
  configuracion, `src/domain` dominio puro, `src/services` casos de uso,
  `src/integrations` adaptadores.
- Respeta SOLID: los servicios dependen de interfaces, no de adaptadores
  concretos; no pongas reglas de negocio en rutas Fastify.
- Respeta SDD: cambios de contrato primero en `specs/openapi.json`, luego
  implementacion, pruebas y documentacion.
- Si un cambio afecta docs, specs o taxonomia, propagalo a las subcarpetas
  relacionadas. Un cambio puntual debe actualizar el README/doc asociado a esa
  carpeta o archivo.

## Pruebas

- Pruebas permanentes van en `tests/` o `tests/contract/`.
- Si necesitas materializar una prueba volatil, avisa al usuario y guardala en
  `tmp/`; no la mezcles con pruebas permanentes salvo que el usuario lo pida o
  aceptes convertirla en test estable.
- Recomienda prueba permanente cuando el cambio cubra contrato, bug o
  comportamiento esperado.
- Todo cambio debe probarse antes de cerrar. Minimo esperado:

```bash
bun run spec:check
bun test
bun run check-types
bun run check
```

## Documentacion y operacion

- Si las pruebas pasan, actualiza la documentacion relacionada antes de terminar.
- Usa sólo scripts declarados en `package.json`. Para Compose local, verifica
  primero la configuración y confirma que `SERVICE_TOKEN` se recibió por el
  entorno; no lo sustituyas por un valor documentado ni lo escribas en archivos.
- `bun run format` reescribe archivos: no lo uses como validación de sólo
  lectura. Detén procesos y contenedores iniciados para una comprobación local
  e informa si deben permanecer activos.
- Consulta los ADR compartidos en `../../docs/adr/` cuando el cambio afecte
  identidad, sesión, datos, recuperación, evaluación o despliegue.
- No guardes secretos en TOML, `.env.example`, docs ni tests.
- No dejes servidores, contenedores o procesos en ejecucion sin informarlo.
