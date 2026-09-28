# ADR 0002: Error Taxonomy as Public Error Contract

## Status

Accepted

## Context

The service shell originally exposed errors as a legacy `ErrorEnvelope` with
`error.code`, `error.message`, `details`, `target` and `innererror`. The
public error contract now requires RFC 9457 `application/problem+json`
extended with declarative behavior fields.

Clients must distinguish failed, retryable, pending and indeterminate
outcomes without parsing free-form text.

## Decision

All HTTP error responses use the problem contract:

- Media type: `application/problem+json`.
- Body fields: `type`, `title`, `status`, `code`, `category`, `detail_key`,
  `behavior`, `correlation.trace_id` and `occurred_at`.
- Public codes use `SVC-<DOMINIO>-<NNNN>`.
- This base implements emittable `CORE` codes. Additional domains may be
  registered later with `defineErrorCode`.
- `x-error-code` remains as an HTTP header and must match the body `code`.
- `correlation.trace_id` uses incoming `x-trace-id` when present, otherwise the
  Fastify request id.
- `type` is a stable URI identifying the problem type and has a documented
  one-to-one mapping with `code`; clients must not infer semantics from
  `title` or `detail`.
- `detail` is human-readable and non-sensitive. It is never a machine-readable
  contract, stack trace, provider message or prompt content.
- Problem extensions must use documented names and clients must ignore unknown
  extensions, as required by RFC 9457.

## Consequences

- The legacy `ErrorEnvelope` response shape is not part of the public contract.
- Clients must consume declarative `behavior` instead of parsing titles or
  messages.
- New problem types document their `type` URI, recommended HTTP status and
  mapping to the internal `code`.
- Changes to existing code behavior require a new ADR because they can alter
  client and workflow decisions.
- The OpenAPI validator rejects 4xx/5xx responses that do not use
  `Problem` as `application/problem+json`.
