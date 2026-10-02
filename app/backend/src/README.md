# src

Codigo fuente del servicio. La entrada del proceso vive en `index.ts`; `http/server.ts` crea la app testeable.

- `config/`: carga y validacion tipada de entorno/TOML.
- `domain/`: schemas, tipos y errores sin dependencia de Fastify.
- `http/`: servidor, rutas, hooks y serializacion de errores.
- `integrations/`: adaptadores reemplazables para recursos externos.
- `services/`: casos de uso desacoplados del transporte HTTP.
- `index.ts`: entrada del proceso.

`domain` y `services` se subdividen por capacidad (`control`, `tools`,
`workflows`, `retrieval`, `data`, `disclosure`, `observability`). Esta
granularidad no cambia la dirección de dependencias: los adaptadores implementan
puertos de servicios y nunca son importados por los casos de uso.
