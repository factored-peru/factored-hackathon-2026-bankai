# Arquitectura del control plane

## Límites de runtime

```text
app/frontend                    Next.js/React: UI cliente y operador
        | Firebase ID token
app/backend                     Bun/TypeScript: autorización y workflow online
        |                         |                 |
        |                         |                 +-- BigQuery: Structured RAG
        |                         +-- GCS: KG-RAG versionado
        |                         +-- Firestore: casos/checkpoints/HITL
        |                         +-- Valkey: sesión y coordinación TTL
data-ingestion-and-processing   Python 3.12: S3->GCS, KDD y grafo offline
```

## Secuencia online

1. El backend verifica el token Firebase y resuelve identidad, tenant, rol y
   capability.
2. SessionManager restaura solo estado efímero autorizado desde Valkey.
3. Normalización, privacidad y Model Armor protegen la entrada.
4. JEV aporta señal de dominio/riesgo/ruta; la policy determinista decide.
5. Una ruta autorizada produce evidencia mediante BigQuery, GCS o una tool
   registrada. Nunca ejecuta SQL o consultas de grafo libres.
6. El backend valida evidencia y respuesta, aplica controles de salida y
   persiste únicamente telemetría saneada.

## Contratos transversales

- `QueryPlan`: template BigQuery, parámetros, límite, rol y tenant permitidos.
- `EvidenceDTO`: origen, versión, filtros, relaciones, métricas y contenido
  autorizado para la respuesta.
- Grafo: `graph-vN.msgpack`, manifiesto, checksum y `current.json` en GCS.
- Estado durable: transición Firestore con versión e idempotency key.

Los detalles normativos están en los ADR 0004, 0005, 0009, 0011, 0017 y 0018.
