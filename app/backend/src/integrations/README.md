# Integraciones

Adaptadores de infraestructura reemplazables por implementaciones reales.

- `database.ts`: placeholder local para el puerto durable; producción usará
  Firestore para casos, checkpoints y aprobaciones.
- `bucket.ts`: placeholder para GCS con artefactos de grafo versionados.
- `cache.ts`: facade local para coordinación efímera.
- `kv/`: contrato y adaptador RESP `node-redis` para Memorystore for Valkey.
- `bigquery/`: ejecutor ADC para planes Structured RAG catalogados; aplica
  tenant server-side, parámetros nombrados, límite de bytes, timeout y filas.
- `firestore/`: snapshots conversacionales saneados con revisión optimista;
  requiere Firestore y no se activa en memoria de producción.
- `gcs/`: carga privada de adjuntos por URL firmada; nunca transporta binarios
  por WebSocket ni los entrega a un modelo en el MVP.
- `memory/`: dobles volátiles para pruebas, nunca persistencia de producción.
- `bigquery/`: `BigQueryQueryExecutor` ejecuta entradas del catálogo como jobs
  parametrizados, con `maximumBytesBilled`, tiempo límite, etiquetas sin
  contenido y sin dataset por defecto. Falla con códigos cerrados y nunca
  devuelve el mensaje del proveedor. `wrapBigQuery` adapta el cliente real; no
  abre conexión al crearse ni al importarse. `dryRun` valida una entrada contra
  las tablas reales sin leer filas.
- `catalog/`: `FileQueryCatalogSource` lee el catálogo JSON de una ruta fijada
  por configuración; la validación vive en `services/data`.
- `identity/`: resuelve la sesión al `customer_id` bancario.
  `StaticCustomerIdentityResolver` es un mapa fijo para demos y pruebas; los
  vínculos los entrega quien lo construye y no se versionan. Un adaptador
  durable (Firestore) lo sustituirá detrás del mismo puerto.
- `tools/` y `providers/`: registros allowlisted y proveedores fail-closed.

Los adaptadores no se conectan durante import-time. El composition root los
crea, inyecta y cierra. Los puertos permanecen en `src/services/ports`; ninguna
ruta HTTP conoce detalles de GCS, BigQuery, Firestore o Valkey.
