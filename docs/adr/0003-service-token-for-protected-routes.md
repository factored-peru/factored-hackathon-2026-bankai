# ADR 0003: Service Token for Protected Routes

## Status

Accepted

## Context

The service shell exposes public health checks and a canonical OpenAPI document,
but business routes may need simple service-to-service authentication when the
base is copied into an internal system.

The base must keep local development friction low while giving production
deployments a consistent way to reject unauthenticated callers.

## Decision

Use an optional `SERVICE_TOKEN` environment variable for protected HTTP routes,
with environment-sensitive fail-closed behavior.

- In `dev`, an empty or unset `SERVICE_TOKEN` disables authentication to keep
  local development friction low.
- In tests, an empty or unset `SERVICE_TOKEN` is allowed only when the test
  explicitly exercises unauthenticated behavior.
- In `staging` and `prod`, an empty or unset `SERVICE_TOKEN` is an invalid
  configuration and the process must fail during startup.
- Configured `SERVICE_TOKEN` requires `Authorization: Bearer <token>`.
- `POST /v1/items` and `GET /v1/items/{itemId}` are protected.
- `/v1/health/live`, `/v1/health/ready` and `/openapi.json` stay public.
- Missing credentials emit `SVC-CORE-2001`.
- Invalid credentials emit `SVC-CORE-2002`.
- OpenAPI declares `components.securitySchemes.serviceToken` and applies it only
  to protected routes.
- This service token authenticates service-to-service callers. It is not a
  browser user session and does not replace user authentication or authorization.

## Consequences

- Development can run without secrets by leaving `SERVICE_TOKEN` empty; staging
  and production cannot.
- Production environments must inject the token through environment variables or
  a secret manager, never through versioned TOML or docs.
- User authentication, authorization scopes and agent policy remain separate
  concerns and are defined by ADR 0006 and the agent control-plane ADRs.
- Clients generated from OpenAPI can detect protected operations.
- Changes to route protection or auth scheme require a new ADR.
