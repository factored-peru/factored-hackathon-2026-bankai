# Estado P0 por responsable y contraste GCP

Fecha de comprobación: 2026-10-05. Este documento es evidencia operativa, no
reemplaza los ADR ni convierte la hoja de tareas en arquitectura normativa.
Las comprobaciones GCP fueron de sólo lectura; no se leyó contenido de
Firestore, resultados BigQuery, valores de entorno ni secretos.

## Snapshot

- Git: `main` y `origin/main` estaban en `3d58500`; los commits de `opentel`
  están contenidos en `main`. La actualización de estados de
  `planning/to-adopt/factored_tasks.xlsx` queda en el mismo cambio documental.
- Proyecto activo: `factored-hackathon` en estado `ACTIVE`.
- Región operativa observada: `us-central1` para Firestore, Cloud Run, Redis,
  VPC Access, Artifact Registry, buckets y datasets BigQuery.

## Recursos confirmados

| Área | Evidencia observada | Implicación P0 |
| --- | --- | --- |
| Estado durable | Firestore Native `(default)` | Existe la base durable de ADR 0017. |
| Runtime | Servicio Cloud Run `bankai-backend` listo y Job `bankai-pipeline` creado | P0-37 tiene infraestructura parcial; no se observaron ejecuciones del Job. |
| Registro e imágenes | Repositorio Docker `bankai` en Artifact Registry | Hay destino de publicación para backend y pipeline. |
| Estado efímero y red | Redis `bankai-sessions` y conector `bankai-vpc` en estado listo | Valkey/VPC existen para P0-30/P0-47. |
| Almacenamiento | Buckets privados de KG y uploads | El bucket KG contiene `demo-bankai/current.json`, manifiesto, catálogo y artefacto msgpack. |
| Datos | Datasets `hackathon`, `raw` y `bankai_evaluation` | Existe tabla `evaluation_results`; también existe `evaluation_results_local`, que no es la tabla productiva declarada. |
| Identidad frontend | Firebase está asociado al proyecto | No se observó habilitación de Firebase App Hosting. |
| Secretos | Existen referencias para token de servicio, cifrado, actor demo y Langfuse; la cuenta Cloud Run tiene acceso a esas referencias | La inyección principal ya existe fuera del repositorio. |

## Brechas verificadas

| Brecha | Evidencia | Tareas afectadas |
| --- | --- | --- |
| Datos curados incompletos | `raw` sólo contiene `branches` y `complaints`; no se observaron datasets `stg`, `aux` o `cur` | P0-06–10, P0-12, P0-44–46 |
| Ingesta ADR 0020 no desplegada | Eventarc, Cloud Tasks, Storage Transfer y Scheduler no están habilitados | P0-41–43, P0-49 |
| Guardrails no verificables | Model Armor API está habilitada, pero la identidad de comprobación no pudo listar templates | P0-25, P0-29, P0-34 |
| Telemetría requiere reconciliación | Cloud Run tiene `TELEMETRY_CORRELATOR_KEY` como variable plana; no se observó un secreto homónimo | P0-33, P0-36. Debe migrarse a Secret Manager antes de un próximo `terraform apply`, conforme ADR 0012. |
| Frontend pendiente | No se observó App Hosting ni un frontend desplegado | P0-16–20, P0-38 |

## Cierre por responsable

### Ricardo

| Estado | Cierre pendiente |
| --- | --- |
| Datos y preparación | Ejecutar contratos, profiling, vistas curadas, preparación, lineage, freshness e imputación sobre tablas BigQuery aprobadas (P0-06–10, P0-44). |
| KDD y grafo | Ejecutar KDD/Naive Bayes sobre datos curados y publicar el artefacto validado con lease Firestore (P0-11–15, P0-45–46). |
| Backend productivo | Cerrar Firebase Auth/RBAC, composición agentic, proveedores aprobados, Firestore/Valkey reales y pruebas de integración (P0-21–22, P0-24–30, P0-35, P0-47). |
| Evaluación | Incorporar los 48 golden cases y 5 extensiones KG C1–C5 a CI y establecer baseline humana antes de umbrales bloqueantes (P0-48). |

### Alexandra

| Estado | Cierre pendiente |
| --- | --- |
| Control plane | Conectar el StateGraph al runner de conversación productivo y validar su ruta completa (P0-23). |
| Observabilidad y guardrails | Configurar Model Armor/SDP autorizados y activar telemetría saneada sólo tras mover el correlador a Secret Manager (P0-33–34). |
| Infraestructura | Declarar/importar recursos existentes, revisar plan autorizado y aplicar IAM, secretos, red, Cloud Run y Job (P0-36–37). |
| Ingesta administrada | Implementar y desplegar la cadena Storage Transfer Service → GCS → Eventarc → Cloud Tasks → worker → BigQuery (P0-41–43, P0-49). |

### All

| Estado | Cierre pendiente |
| --- | --- |
| Calidad transversal | Ejecutar QA E2E, resiliencia, aislamiento y flujo HITL sobre el entorno integrado (P0-39). |
| Sesiones | Verificar SessionManager con Firestore y Valkey reales, incluyendo recuperación y coordinación (P0-47). |
| Alcance posterior | Voz y documentos permanecen P1; no bloquean el cierre P0. |

## Próxima secuencia segura

1. Corregir la referencia del correlador como secreto y ejecutar un `terraform
   plan` revisado, sin aplicar mientras proponga eliminar configuración útil.
2. Habilitar y desplegar la cadena de ingesta ADR 0020; materializar primero
   las capas raw, staging, auxiliares y curadas.
3. Ejecutar KDD reproducible, publicar el grafo y habilitar sólo las
   operaciones KG-RAG permitidas.
4. Completar identidad, guardrails y control plane productivo; después ejecutar
   la batería E2E y la baseline humana.

Las acciones que escriben recursos GCP, ejecutan cargas BigQuery o activan
proveedores requieren autorización y credenciales apropiadas fuera de Git.
