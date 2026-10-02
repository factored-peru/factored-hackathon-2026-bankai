# Data ingestion and processing

Pipeline offline en Python 3.12. No expone endpoints ni participa en peticiones
de usuario.

## Responsabilidades

1. Orquestar la transferencia no destructiva de CSV desde S3 a GCS.
2. Cargar CSV a tablas raw de BigQuery y conservar manifiesto y lineage.
3. Perfilar, deduplicar, normalizar, crear tablas auxiliares e imputar datos
   según reglas estadísticas reproducibles.
4. Ejecutar KDD y exploración de Naive Bayes sin usarlo para decisiones online.
5. Compilar y publicar `graph-vN.msgpack`, manifiesto, checksum y `current.json`
   en GCS para consumo validado del backend.

`manifests/source_manifest.txt` contiene el inventario de entradas recibido.
El código irá bajo `src/`, los ejecutables bajo `scripts/` y las pruebas bajo
`tests/`.
