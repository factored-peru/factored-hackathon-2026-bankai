# Módulos

- `registry`: Artifact Registry Docker (`bankai`) + SA opcional GitHub CI
  (writer); los readers de Cloud Run se cablean en el environment.
- `runtime`: Cloud Run backend/job, SA, bucket KG; inyecta `GCS_GRAPH_*` y
  flags productivos cuando recibe outputs de `state`.
- `state`: Firestore Native, Memorystore Redis/Valkey path, VPC connector,
  bucket GCS de uploads + índice `conversation_snapshots`.
- `frontend`: Firebase App Hosting y configuración pública mínima (pendiente).
- `pipeline` / `data` / `network` / `observability`: mapa ADR; aún no
  materializados como módulos aparte.
