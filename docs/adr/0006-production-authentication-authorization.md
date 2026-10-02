# ADR 0006: Autenticación Firebase y autorización backend

## Status

Accepted

## Context

Cliente y operador requieren una identidad demostrable sin integrar banca real
durante el MVP.

## Decision

Firebase Auth proporciona usuarios de prueba y custom claims para roles
`client` y `operator`. El frontend entrega un ID token al backend; Firebase
Admin lo verifica server-side. SessionManager deriva tenant, sujeto, rol y
capabilities y emite una sesión opaca con protección CSRF.

El backend falla cerrado ante token inválido, expirado, emisor/audience
incorrecto o rol insuficiente. Ninguna tool, consulta BigQuery o operación de
grafo confía en atributos enviados por el navegador o el prompt.

## Consequences

La identidad bancaria real, biometría, DNI y RENIEC quedan fuera del MVP. El
frontend nunca recibe credenciales privilegiadas de Google Cloud.
