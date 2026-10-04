# http

Servidor, rutas, hooks y serialización de errores. `routes.ts` conserva HTTP
canónico en OpenAPI y expone `GET /v1/realtime` sólo cuando el runtime realtime
está habilitado. Los envelopes WebSocket viven en `specs/asyncapi.json`; una ruta
de socket nunca recibe binarios ni contiene decisiones de negocio.
