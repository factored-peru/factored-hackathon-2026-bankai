# ADR 0005: Sesión server-side y boundary de datos privados

## Status

Accepted

## Context

El agente opera sobre datos asociados a un usuario autenticado. El modelo y Jev
necesitan suficiente contexto para decidir, pero no deben recibir el estado
privado completo de la sesión. Algunas herramientas sí necesitan datos reales
para ejecutar una operación autorizada.

El diseño debe evitar dos errores opuestos:

- enviar identidad, credenciales o resultados completos a componentes externos;
- impedir que una operación autorizada se ejecute porque el modelo no conoce el
  valor privado real.

## Decision

Usar una sesión server-side y un `PrivateDataBroker` local.

La implementación de infraestructura elegida para el MVP está definida en
[ADR 0017](0017-kv-session-and-postgres-checkpointer.md): la capa KV con Valkey
predeterminado o Redis almacena sesiones y handles efímeros; PostgreSQL almacena
checkpoints y aprobaciones durables. El dominio depende solamente de las
interfaces de este ADR.

### Sesión

- El cliente recibe un cookie con un identificador opaco.
- El backend mantiene identidad, tenant, roles, capacidades, versión, estado y
  expiración en un `SessionStore`.
- El cookie es `HttpOnly`, `Secure`, tiene `SameSite` apropiado y nunca contiene
  datos privados, permisos completos ni valores de negocio.
- La sesión se rota después de autenticación o elevación de privilegios y puede
  revocarse server-side.
- `SERVICE_TOKEN` continúa siendo autenticación de servicio, no sesión de
  usuario.

### Boundary de datos

El LLM, Jev, RAG y Model Armor reciben una proyección mínima del estado. No
reciben el `sessionId` resoluble ni credenciales.

Los datos que deban ser referenciados por una herramienta se convierten en
handles opacos emitidos por el backend. Cada handle queda ligado a:

```text
sessionId
userId / tenantId
purpose
toolId o audience
session version
expiration
single-use policy
```

Un handle no es una autorización independiente. La resolución siempre repite
las comprobaciones de sesión, tenant, permisos y policy engine.

### Ejecución de herramientas

El modelo propone:

```json
{
  "tool": "get_employee_movements",
  "arguments": {
    "account_ref": "ref_7f3c..."
  }
}
```

El backend valida el tool call, autoriza la acción, resuelve `account_ref` en
memoria y ejecuta con credenciales propias. No se aceptan valores privados
literales ni handles inventados por el modelo.

### Divulgación

Los resultados crudos permanecen privados. Una política local decide por campo
si el dato se permite, se enmascara, se omite o bloquea, usando sesión, rol,
tenant, propósito y sensibilidad.

El resultado minimizado puede pasar al LLM para construir la respuesta. Antes de
la respuesta HTTP se ejecuta además Model Armor/Sensitive Data Protection y una
redacción local final. Los secretos siempre se omiten; los datos financieros o
personales se muestran solo con autorización explícita y en el formato mínimo.

La detección y la autorización son responsabilidades distintas:

```text
DisclosurePolicy local
  → autoriza, enmascara u omite según sesión, rol, tenant y propósito

Sensitive Data Protection Advanced
  → detecta, transforma o redacta tipos sensibles
```

Model Armor no puede convertir un dato `DENY` en `ALLOW`. Los datos de sesión
privados no se envían crudos a Model Armor; solo cruza la frontera la
proyección ya autorizada y minimizada.

Cuando se requiere de-identification, la respuesta se procesa en modo buffered.
El streaming sensible queda deshabilitado porque la sanitización streaming no
aplica de-identification SDP.

## Consequences

### Positivas

- Los datos privados permanecen bajo control del backend.
- El modelo puede trabajar con referencias útiles sin conocer valores sensibles.
- El tool executor puede recuperar datos autorizados justo antes de ejecutar.
- La política de divulgación evita fugas por respuestas generadas.
- La rotación o revocación de sesión invalida handles y aprobaciones asociadas.

### Costos y límites

- Se necesita un almacén de sesión y un broker con TTL, revocación y auditoría.
- Cada tool call debe hacer una validación adicional antes de resolver handles.
- La redacción agrega latencia y requiere pruebas por rol y propósito.
- Los logs y trazas deben pseudonimizar sesión y handles.

## Interfaces internas

```ts
interface SessionStore {
  get(sessionId: string): Promise<SessionContext | null>;
  create(input: CreateSessionInput): Promise<SessionContext>;
  rotate(sessionId: string): Promise<SessionContext>;
  revoke(sessionId: string, reason: string): Promise<void>;
}

interface PrivateDataBroker {
  mintHandle(input: MintHandleInput): Promise<string>;
  resolveHandle(input: ResolveHandleInput): Promise<unknown>;
}

interface DisclosurePolicy {
  decide(input: DisclosureInput): Promise<DisclosureDecision>;
}
```

Estas interfaces viven en dominio/servicios. Valkey, Redis, PostgreSQL u otro almacén
son detalles de integración y no deben filtrarse a las rutas ni al grafo.

## Fallos obligatorios

- sesión ausente, inválida, expirada o revocada: detener con autenticación
  fallida;
- handle inexistente, expirado, reutilizado o de otra audiencia: denegar;
- permisos modificados después de crear el handle: evaluar permisos actuales;
- fallo del broker: no ejecutar y no enviar el dato privado al modelo;
- fallo de redacción: omitir el dato y escalar o responder de forma segura;
- replay de aprobación: invalidar aprobación y exigir una nueva;
- sesión revocada durante HITL: invalidar aprobación y handles relacionados.

## Referencias

- [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [OAuth 2.0 Security Best Current Practice, RFC 9700](https://datatracker.ietf.org/doc/html/rfc9700)
- [Model Armor overview](https://docs.cloud.google.com/model-armor/overview)
- [Sanitize prompts and responses](https://docs.cloud.google.com/model-armor/sanitize-prompts-responses)
