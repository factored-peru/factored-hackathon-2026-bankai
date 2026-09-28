# API roadmap

Este documento prepara los siguientes contratos públicos sin habilitar todavía
los proveedores externos. Cada contrato nuevo debe seguir SDD: modificar
primero `specs/openapi.json`, validar con `bun run spec:check`, implementar,
añadir pruebas permanentes y actualizar esta hoja.

## Orden recomendado

### 1. Bootstrap de identidad y sesión

La identidad debe validarse contra el issuer configurado (`AUTH_ISSUER_URL`,
`AUTH_AUDIENCE`, `AUTH_JWKS_URL`) y convertirse en una sesión server-side.
El cliente no elige `tenantId`, `userId`, permisos ni el estado privado.

Contratos previstos:

- `POST /v1/session`: crea o rota la sesión después de validar la identidad
  externa; devuelve solo metadatos mínimos y el token CSRF.
- `GET /v1/session`: devuelve estado mínimo de la sesión actual, sin cookie,
  session ID, credenciales ni estado privado completo.
- `DELETE /v1/session`: revoca la sesión y sus handles.
- `GET /v1/session/csrf`: alternativa para renovar el token CSRF sin exponer
  el secreto.

La cookie será `__Host-session`, `HttpOnly`, `Secure`, `SameSite=Lax` y sin
`Domain`. Las mutaciones exigirán `Origin` permitido y CSRF válido. El
`SERVICE_TOKEN` actual sigue siendo autenticación servicio-a-servicio; no
sustituye esta sesión de usuario.

### 2. Ejecución durable del agente

Contratos previstos:

- `POST /v1/agent/runs`: recibe el mensaje ya validado y una `idempotency_key`;
  devuelve `202` con `workflow_id` y estado resumido.
- `GET /v1/agent/runs/{workflowId}`: devuelve estado, etapa, decisión pública
  y aprobación pendiente, pero no checkpoints privados ni secretos.
- `POST /v1/agent/runs/{workflowId}/resume`: acepta una decisión de aprobación
  con `approval_id`, `sessionVersion` e idempotencia.
- `POST /v1/agent/runs/{workflowId}/cancel`: cancela una ejecución autorizada.

La ejecución usa `sessionId` únicamente dentro del backend. El modelo, Jev,
RAG y proveedores externos reciben una proyección mínima; los argumentos de
tool se envían con handles opacos. Justo antes del tool call, un resolver
server-side sustituye esos handles por datos de la sesión, verifica scope,
tenant, versión y expiración, y evita registrar el payload resuelto.
En el MVP los handles privados son single-use y se consumen atómicamente.

Antes del router LLM, el backend normaliza y desidentifica el último mensaje;
Model Armor inspecciona esa proyección sin historial ni system prompt. Luego Jev
ejecuta un domain gate tipado. Sus resultados
`in_domain`, `out_of_domain` y `ambiguous` se reflejan como decisiones internas:
`out_of_domain` termina con una respuesta segura; `ambiguous` crea un workflow
`WAITING_FOR_CLARIFICATION`; solo `in_domain` habilita el router LLM. Jev puede
sugerir una ruta y una confianza, pero nunca concede autorización a una tool.

El comando `bun run agent:matrix -- --all` ejecuta variantes sintéticas del
flujo, incluyendo prompt injection directa/indirecta, Jev indisponible,
confianza baja, aislamiento de tenant, replay de handles y fallo de respuesta.
No usa API keys ni demuestra por sí solo cumplimiento o eficacia de proveedores.

### 3. Aprobaciones y disclosure

Si el flujo requiere HITL, se puede exponer:

- `GET /v1/approvals/{approvalId}`: resumen mínimo de una aprobación de la
  sesión actual.
- `POST /v1/approvals/{approvalId}/decision`: `approve` o `reject`, con
  idempotencia y control de versión.

La respuesta final debe aplicar la `DisclosurePolicy` y luego el pipeline de
sanitización de Google Model Armor + Sensitive Data Protection. Si quedan
datos sensibles no permitidos, se redactan, tokenizan o bloquean antes de
responder. No se ofrecerá streaming de respuestas sensibles hasta tener una
redacción compatible con streaming.

### 4. Integraciones internas, no endpoints públicos

No se deben crear endpoints públicos genéricos para ejecutar tools, consultar
SQL, elegir filtros de Qdrant o llamar URLs. Esas capacidades serán interfaces
internas allowlistadas:

- `SessionStore` y `PrivateDataResolver`.
- `ToolRegistry` y `ToolExecutor`.
- `QueryPlanCompiler` con tenant/RLS.
- `Retriever` con filtro de tenant inyectado por backend.
- `GuardrailProvider` para entrada, salida y contenido recuperado.
- `ModelProvider` para Vertex/Jev/otros proveedores aprobados.

La foundation tipada de estos contratos ya vive en `src/domain` y
`src/services/ports`, con orquestación y adaptadores en memoria para pruebas.
Eso no significa que los proveedores externos o los endpoints estén
habilitados; su estado se detalla en `docs/control-plane-foundation.md`.

## Variables y secretos

Las variables de preparación están en `.env.example` y validadas por
`src/config/env.ts`. No se deben añadir valores reales allí. Valkey es el
proveedor KV predeterminado para `SessionStore` y `PrivateDataBroker`, con Redis
como alternativa intercambiable; sus variables son `KV_PROVIDER`, `KV_URL`,
`KV_USERNAME`, `KV_PASSWORD`, `KV_TLS`, `KV_KEY_PREFIX`, `SESSION_TTL_SECONDS` y
`HANDLE_TTL_SECONDS`. Para Google Cloud
se configura ADC/IAM y la región debe coincidir con los templates de Model
Armor; para Qdrant se usa `QDRANT_API_KEY`; para proveedores opcionales se usa
la variable `*_API_KEY` correspondiente.

## Criterio de terminado por API

Antes de declarar una etapa lista debe existir:

1. contrato OpenAPI con errores RFC 9457;
2. autenticación/autorización y ownership de sesión probados;
3. idempotencia, timeout, rate limit y auditoría sin contenido sensible;
4. pruebas de handles opacos, resolución server-side y redacción de salida;
5. prueba de fallo cerrado cuando guardrail, sesión o policy engine no estén
   disponibles.
