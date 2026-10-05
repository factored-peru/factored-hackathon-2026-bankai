# State module (Firestore + Memorystore + GCS uploads)

Aprovisiona el estado durable/efímero mínimo para sesiones, usuarios e
interactividad (ADR 0017 / 0005):

- Firestore Native `(default)` + índice compuesto de `conversation_snapshots`
- Memorystore Redis 7 (RESP, compatible con `node-redis` / Valkey client path)
- Serverless VPC Access connector (Cloud Run → Memorystore en red `default`)
- Bucket GCS privado para adjuntos de conversación

No crea cuentas de servicio del backend (viven en `runtime`). El entorno
`dev` enlaza IAM del bucket de uploads a la SA del runtime tras ambos módulos.

`terraform apply` requiere autorización explícita.
