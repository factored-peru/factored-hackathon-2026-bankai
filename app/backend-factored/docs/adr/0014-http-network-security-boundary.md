# ADR 0014: Boundary HTTP, browser y red

## Status

Accepted

## Context

La sesión browser, los proveedores de IA y las herramientas externas amplían el
perímetro. El backend debe limitar requests, navegador, egress y resolución de
URLs.

## Decision

Fuera de local:

- TLS es obligatorio.
- CORS usa allowlist explícita.
- Mutaciones con cookie requieren CSRF y validación de Origin.
- Body máximo: 1 MiB.
- Timeout HTTP por defecto: 30 segundos.
- Rate limit por usuario/sesión/tenant y límites de concurrencia para workflows.
- Trusted proxy se configura explícitamente; no se confía ciegamente en
  `X-Forwarded-*`.
- Se aplican security headers, incluyendo una CSP adecuada al frontend.
- Egress solo permite dependencias registradas: base de datos, Qdrant,
  proveedores aprobados, Model Armor y secret manager.
- No existe `fetch_url(url)` genérico expuesto al LLM; las URLs se validan con
  allowlist y protección SSRF.

Los defaults son configurables por ambiente, pero no se relajan en `staging` o
`prod` sin una decisión documentada.

## Consequences

- La integración con nuevos proveedores exige actualizar la allowlist de egress.
- El frontend debe conocer el mecanismo CSRF, pero nunca recibe secretos de
  sesión.
- Las pruebas de red forman parte de la suite de seguridad.

## Referencias

- [OWASP CSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP SSRF Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html)
- [OWASP HTTP Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)
