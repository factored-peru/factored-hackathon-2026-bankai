# ADR 0021: Frontend Next.js y entrega mediante Firebase App Hosting

## Status

Accepted

## Context

La experiencia cliente y backoffice necesita una entrega web administrada en
GCP sin otorgar acceso directo a datos bancarios ni sustituir la autorización
del backend. El repositorio todavía no contiene el proyecto Next.js, una
configuración de App Hosting ni módulos Terraform ejecutables.

## Decision

`app/frontend/` usa Next.js 15.2, React, TypeScript estricto y Tailwind CSS
para las superficies de cliente y operador. Firebase Auth obtiene el ID token
de usuarios demo; el backend Cloud Run verifica identidad, tenant, rol y
capabilities. El navegador no autoriza acciones ni consulta BigQuery, GCS,
Firestore o Valkey directamente.

Firebase App Hosting es el único destino soportado para el frontend y despliega
desde la rama principal configurada. Vercel no es una ruta soportada. App
Hosting recibe la aplicación Next.js; la API y WebSocket autorizados se sirven
desde el backend Cloud Run como servicio independiente.

La configuración cliente expone únicamente valores públicos allowlisted, como
el origen de API y la configuración pública de Firebase. No se colocan secretos
ni credenciales privilegiadas en `NEXT_PUBLIC_*`. CORS, CSRF, HTTPS, egress y
límites de red se rigen por ADR 0014.

## Consequences

Las tareas P0 del frontend deben crear el proyecto, lockfile, configuración de
App Hosting, integración Firebase Auth y smoke test externo antes de declarar
el frontend desplegado. Terraform podrá referenciar esos recursos, pero no
alberga lógica de producto ni secretos versionados.

## References

- https://firebase.google.com/docs/app-hosting
- `../../app/frontend/README.md`
- `../../deploy/README.md`
