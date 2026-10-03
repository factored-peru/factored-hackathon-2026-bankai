# Integraciones

Adaptadores de infraestructura reemplazables por implementaciones reales.

- `database.ts`: placeholder local para el puerto durable; producción usará
  Firestore para casos, checkpoints y aprobaciones.
- `bucket.ts`: placeholder para GCS con artefactos de grafo versionados.
- `cache.ts`: facade local para coordinación efímera.
- `kv/`: contrato y adaptador RESP `node-redis` para Memorystore for Valkey.
- `bigquery/`: ejecutor ADC para planes Structured RAG catalogados; aplica
  tenant server-side, parámetros nombrados, límite de bytes, timeout y filas.
- `memory/`: dobles volátiles para pruebas, nunca persistencia de producción.
- `tools/` y `providers/`: registros allowlisted y proveedores fail-closed.

Los adaptadores no se conectan durante import-time. El composition root los
crea, inyecta y cierra. Los puertos permanecen en `src/services/ports`; ninguna
ruta HTTP conoce detalles de GCS, BigQuery, Firestore o Valkey.
