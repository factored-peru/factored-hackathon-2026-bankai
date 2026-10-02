# ADR 0014: Frontera HTTP, navegador y red en GCP

## Status

Accepted

## Context

La aplicación combina navegador, API, servicios administrados y proveedores de
IA; cualquier egress o URL no controlada amplía la superficie de ataque.

## Decision

El frontend se sirve por Firebase App Hosting y llama al backend Cloud Run por
HTTPS. El backend verifica ID token, aplica CORS de orígenes explícitos, CSRF
para sesión basada en cookie, límites de tamaño y timeouts. Las dependencias
autorizadas son Firebase Admin, BigQuery, GCS, Firestore, Memorystore for
Valkey por red privada, Secret Manager, Model Armor, Vertex AI y JEV.

No se realizan fetches arbitrarios ni se siguen URLs aportadas por usuario. El
pipeline Python se ejecuta como Cloud Run Job separado y solo accede a S3/GCS,
BigQuery y recursos explícitamente concedidos por IAM.

## Consequences

Cada cuenta de servicio tiene privilegios mínimos y los endpoints internos no
se exponen por el navegador ni por el modelo.
