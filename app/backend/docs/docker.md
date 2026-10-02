# Docker

La imagen pertenece al backend, pero la orquestación local vive en la raíz del
monorepo. Los comandos se ejecutan desde `app/backend/`.

## Construir

```bash
docker build -t base-bun-typescript-service .
```

## Levantar con Compose

```bash
export SERVICE_TOKEN="$(openssl rand -base64 32)"
docker compose -f ../../deploy/local/backend-compose.yml up --build -d
```

El servicio queda publicado en `http://127.0.0.1:8010`. Compose también levanta
Valkey para la capa de sesión; `SESSION_STORE_ENABLED` permanece desactivado
hasta que se suministre una clave de cifrado segura.

## Ejecutar

```bash
docker run --rm -p 8010:3000 base-bun-typescript-service
```

## Probar

```bash
curl -fsS http://127.0.0.1:8010/v1/health/live
curl -fsS http://127.0.0.1:8010/openapi.json
```

## Configuracion

El contenedor usa:

- `APP_ENV=prod`
- `HOST=0.0.0.0`
- `PORT=3000`
- `CONFIG_FILE=config/settings.toml`
- `KV_PROVIDER=valkey`
- `KV_URL=redis://valkey:6379`
- `KV_TLS=false` solo para la red local de Compose

Como Compose usa `APP_ENV=prod`, `SERVICE_TOKEN` es obligatorio y debe venir del
entorno o de un `.env` local no versionado. Para activar la sesión, define además
`SESSION_STORE_ENABLED=true` y `PRIVATE_DATA_ENCRYPTION_KEY` con 32 bytes
codificados en base64url; no guardes esos valores en el repositorio.

Puedes sobrescribir cualquier valor con `-e`.

## Apagar Compose

```bash
docker compose -f ../../deploy/local/backend-compose.yml down
```
