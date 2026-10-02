# ADR 0014: Frontera HTTP, navegador y red en GCP

## Status

Accepted

## Evolución

El stack y hosting del frontend se separan en ADR 0021. Esta ADR conserva una
sola responsabilidad: la frontera de red, navegador y servicios GCP que protege
esa entrega.

## Context

La aplicación combina navegador, API, servicios administrados y proveedores de
IA; cualquier egress o URL no controlada amplía la superficie de ataque.

## Decision

El frontend definido en ADR 0021 llama al backend Cloud Run por HTTPS. El
backend verifica ID token, aplica CORS de orígenes explícitos, CSRF para sesión
basada en cookie, límites de tamaño y timeouts. Las dependencias autorizadas
son Firebase Admin, BigQuery, GCS, Firestore, Memorystore for Valkey por red
privada, Secret Manager, Model Armor, Vertex AI, JEV, Cloud Scheduler,
Eventarc, Cloud Tasks y Cloud Run Functions.

No se realizan fetches arbitrarios ni se siguen URLs aportadas por usuario. El
pipeline definido en ADR 0020 se ejecuta como Cloud Run Job separado y solo
accede a S3/GCS, BigQuery y recursos explícitamente concedidos por IAM. Los
targets de Eventarc y Cloud Tasks son privados y usan identidad de servicio;
ningún trigger o worker de ingesta se expone al navegador.

## Consequences

Cada cuenta de servicio tiene privilegios mínimos y los endpoints internos no
se exponen por el navegador ni por el modelo.
