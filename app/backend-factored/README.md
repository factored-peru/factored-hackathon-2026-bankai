# Bun TypeScript Service

Plantilla base para servicios HTTP con Bun, TypeScript estricto, Fastify y Zod.

## Stack

- Bun `>=1.4.0`
- TypeScript ESM estricto
- Fastify
- Zod
- Biome
- `bun test`

## Estructura

```txt
src/
  config/       Variables de entorno tipadas
  domain/       Schemas, tipos y errores puros
  http/         Servidor, rutas y serializacion de errores
  integrations/ Adaptadores reemplazables
  services/     Casos de uso
  index.ts      Entrada del proceso
config/         TOML versionable con perfiles dev, staging y prod
docs/           SDD, errores, SOLID, Docker y ADR
specs/          OpenAPI canonico y reglas de contrato
scripts/        Automatizacion SDD local
tests/          Pruebas de contrato y servicios
AGENTS.md       Reglas estrictas para agentes de codigo
Dockerfile      Imagen de produccion
docker-compose.yml Orquestacion local de contenedor
```

## Comandos

```bash
bun install
bun run dev
bun run build
bun run spec:check
bun test
bun run check
bun run check-types
bun run agent:matrix -- --all
```

`bun run build` emite a `dist/` via `tsconfig.build.json`. El runtime local sigue siendo Bun sobre `src/` (`dev` / `start`).

## Ejecutar desde cero

1. Instala Bun `>=1.4.0`.
2. Instala dependencias:

```bash
bun install
```

3. Revisa la configuracion versionable en `config/settings.toml`.
4. Si necesitas overrides locales, crea `.env` tomando `.env.example` como base.
   No guardes secretos en TOML ni en git.
5. Arranca el servicio:

```bash
bun run dev
```

6. Verifica health y spec:

```bash
curl http://127.0.0.1:3000/v1/health/live
curl http://127.0.0.1:3000/v1/health/ready
curl http://127.0.0.1:3000/openapi.json
curl http://127.0.0.1:3000/docs
```

7. Antes de abrir cambios, ejecuta:

```bash
bun run spec:check
bun test
bun run check-types
bun run check
```

## Spec Driven Development

El contrato canonico vive en `specs/openapi.json`. Para cambiar el API:

1. Cambia primero `specs/openapi.json`.
2. Ejecuta `bun run spec:check`.
3. Implementa o ajusta rutas, schemas y servicios.
4. Agrega contract tests en `tests/contract`.
5. Ejecuta `bun test`.

## Errores y SOLID

- Taxonomia de errores y `application/problem+json`: `docs/errors.md`.
- ADR aceptadas: `docs/adr/`.
- Principios SOLID aplicados: `docs/solid.md`.
- Foundation del control plane y trazabilidad ADR: `docs/control-plane-foundation.md`.

## Configuracion

Configura defaults versionables en `config/settings.toml`. Usa `APP_ENV=dev`,
`APP_ENV=staging` o `APP_ENV=prod` para seleccionar perfil. Usa `.env` o
variables reales de entorno para secretos y overrides locales.

Precedencia: defaults del codigo < `[app]` TOML < perfil TOML < entorno cargado
por Bun.

Las capas `database`, `bucket` y `cache` existen como integraciones opcionales.
Por defecto `DATABASE_ENABLED`, `BUCKET_ENABLED` y `CACHE_ENABLED` estan en
`false`; una capa deshabilitada no se conecta ni cuenta para readiness. Para
Postgres en TypeScript, el patron documentado es Prisma Client.

La sesión de usuario será server-side sobre una capa KV cuando
`SESSION_STORE_ENABLED=true`. La cookie `__Host-session` solo contiene un ID
opaco; los handles privados se almacenan con TTL y cifrado, y el estado durable
de LangGraph queda separado en PostgreSQL. Valkey es el proveedor predeterminado
y Redis sigue soportado mediante RESP. La conexión KV se crea desde el
composition root, nunca desde una ruta HTTP.

`SERVICE_TOKEN` es opcional solo en `dev` y en pruebas controladas. En `staging`
y `prod`, el proceso falla al arrancar si falta. Si esta configurado,
`POST /v1/items` y `GET /v1/items/{itemId}` requieren
`Authorization: Bearer <token>`. Los endpoints `/v1/health/live`,
`/v1/health/ready`, `/openapi.json` y `/docs` permanecen publicos.

Este token es autenticacion servicio-a-servicio; no representa la sesion de un
usuario final. Las decisiones completas de autenticacion, autorizacion, CSRF y
sesiones estan en `docs/adr/0006-production-authentication-authorization.md`.

El control plane agentic se puede probar sin proveedores externos con:

```bash
bun run agent:matrix -- --all
bun run agent:matrix -- --scenario direct-prompt-injection
bun run agent:matrix -- --scenario authorized-database --plain
bun run agent:matrix -- --json
```

El simulador usa fixtures sintéticos, no requiere API keys y muestra en formato
vertical el prompt, la sesión, la proyección sin PII, los verdicts de guardrail,
Jev, routing, policy, recuperación, disclosure, generación, reemplazo validado
y respuesta. También valida rutas terminales, aclaraciones, handles, tenant
isolation y sanitización final. `--plain` o `NO_COLOR=1` desactivan colores;
`--json` devuelve una traza minimizada sin prompts crudos, valores privados ni
handles completos.

```env
SERVICE_TOKEN=local-dev-token
```

```bash
curl -X POST http://127.0.0.1:3000/v1/items \
  -H "Authorization: Bearer local-dev-token" \
  -H "Content-Type: application/json" \
  -d '{"name":"demo","metadata":{}}'
```

Si falta la credencial, la API responde `SVC-CORE-2001`; si el token es
incorrecto, responde `SVC-CORE-2002`.

## Docker

Manual: `docs/docker.md`.

```bash
docker compose up --build -d
```
