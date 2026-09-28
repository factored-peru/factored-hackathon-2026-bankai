# ADR 0006: Autenticación y autorización de producción

## Status

Accepted

## Context

La plantilla tiene autenticación opcional mediante `SERVICE_TOKEN`, pero un
servicio expuesto en `staging` o `prod` no puede iniciar sin una credencial de
servicio. Además, la autenticación servicio-a-servicio no representa la sesión
de un usuario final ni decide qué puede hacer el agente.

## Decision

Separar cuatro responsabilidades:

```text
Service Authentication → quién llama al backend
User Authentication    → qué usuario inició la sesión
Authorization          → qué recursos/capacidades tiene el usuario
Agent Policy           → qué acción concreta puede ejecutar el workflow
```

- `SERVICE_TOKEN` vacío solo es válido en `dev` y pruebas explícitas.
- En `staging` y `prod`, la configuración inválida provoca fallo al arrancar.
- Las sesiones de navegador usan cookie `__Host-session`, `HttpOnly`, `Secure`,
  `Path=/`, sin `Domain` y `SameSite=Strict` por defecto.
- Las mutaciones con cookie requieren validación de `Origin` y token CSRF
  sincronizado o cookie-to-header; `SameSite` es defensa adicional, no la única.
- CORS usa una allowlist explícita; nunca `*` junto con credenciales.
- Los scopes y capacidades se verifican en cada tool call, no solo al iniciar la
  sesión.
- Un `threadId`, `workflowId` o `decisionId` nunca concede autorización.

La cookie `__Host-` y la defensa CSRF siguen las recomendaciones de OWASP:
`SameSite` no sustituye una defensa CSRF completa.

## Consequences

- El arranque de producción es fail-closed.
- Cambiar de proveedor de identidad no cambia la política del agente.
- Las pruebas deben distinguir service auth, user auth, scopes y policy.
- Las aplicaciones browser requieren configuración explícita de origen confiable.

## Referencias

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [RFC 9700 OAuth 2.0 Security BCP](https://datatracker.ietf.org/doc/html/rfc9700)
