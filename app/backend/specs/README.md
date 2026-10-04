# specs

Contrato canonico del servicio. `openapi.json` se edita antes que la implementacion.

- `openapi.json`: superficie HTTP publica, schemas y respuestas de error.
- `asyncapi.json`: contrato de `GET /v1/realtime`; complementa OpenAPI y no
  duplica el transporte WebSocket.
