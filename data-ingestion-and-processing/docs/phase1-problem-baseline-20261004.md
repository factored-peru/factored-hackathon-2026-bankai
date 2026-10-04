# Fase 1 — evidencia del problema y baseline manual

Snapshot agregado sobre BigQuery. Sin PII, textos ni IDs de cliente.

## Metadatos

| Campo | Valor |
| --- | --- |
| generated_at | 2026-10-04T20:46:50.890588Z |
| project | `factored-hackathon` |
| dataset | `hackathon` |
| timezone | America/Lima |
| period | `2023-06-17T00:00:00Z` → `2026-06-19T00:00:00Z` |
| population | complaints.category = 'Transactions' |

## P0-01 — distribución de motivos

Query: `p0-01-contact-motive-distribution`

| motive | case_type | count | share |
| --- | --- | ---: | ---: |
| Cargo no reconocido | Complaint | 7466 | 0.549779 |
| Cargo no reconocido | Claim | 3014 | 0.221944 |
| Cargo no reconocido | Request | 1214 | 0.089396 |
| UNKNOWN | Complaint | 773 | 0.056922 |
| Cargo no reconocido | Suggestion | 603 | 0.044404 |
| UNKNOWN | Claim | 321 | 0.023638 |
| UNKNOWN | Request | 115 | 0.008468 |
| UNKNOWN | Suggestion | 74 | 0.005449 |

## P0-02 — denominadores y severidad

Query: `p0-02-population-denominator`

- Población Transactions: **13580**
- Prioridad Low/Medium/High/Critical: 4142 / 6759 / 2035 / 644
- Estados Open / In Process / Escalated / Resolved / Closed / Rejected: 4040 / 5407 / 677 / 2780 / 551 / 125
- Con canal de recepción: 13580
- Con `origin_interaction_id`: 0 (limitación: vínculo interacción→reclamo incompleto)

### Temporalidad mensual

Query: `p0-02-volume-severity-temporality`

| year_month | volume | high_or_critical | escalated | sla_breached |
| --- | ---: | ---: | ---: | ---: |
| 2023-06 | 174 | 28 | 10 | 35 |
| 2023-07 | 383 | 85 | 14 | 90 |
| 2023-08 | 414 | 79 | 15 | 96 |
| 2023-09 | 359 | 71 | 20 | 82 |
| 2023-10 | 366 | 80 | 25 | 50 |
| 2023-11 | 352 | 64 | 26 | 62 |
| 2023-12 | 371 | 56 | 11 | 69 |
| 2024-01 | 390 | 74 | 18 | 73 |
| 2024-02 | 338 | 64 | 15 | 66 |
| 2024-03 | 369 | 77 | 24 | 90 |
| 2024-04 | 423 | 79 | 23 | 72 |
| 2024-05 | 349 | 62 | 19 | 71 |
| 2024-06 | 370 | 72 | 13 | 70 |
| 2024-07 | 388 | 83 | 21 | 91 |
| 2024-08 | 377 | 71 | 16 | 73 |
| 2024-09 | 380 | 81 | 18 | 81 |
| 2024-10 | 394 | 85 | 23 | 79 |
| 2024-11 | 366 | 75 | 13 | 70 |
| 2024-12 | 354 | 67 | 16 | 66 |
| 2025-01 | 396 | 93 | 23 | 93 |
| 2025-02 | 361 | 73 | 15 | 63 |
| 2025-03 | 380 | 68 | 23 | 71 |
| 2025-04 | 365 | 82 | 16 | 88 |
| 2025-05 | 374 | 89 | 14 | 77 |
| 2025-06 | 364 | 73 | 17 | 57 |
| 2025-07 | 388 | 73 | 25 | 87 |
| 2025-08 | 410 | 67 | 21 | 74 |
| 2025-09 | 379 | 78 | 15 | 70 |
| 2025-10 | 403 | 71 | 20 | 75 |
| 2025-11 | 353 | 68 | 17 | 58 |
| 2025-12 | 395 | 76 | 19 | 84 |
| 2026-01 | 370 | 72 | 20 | 73 |
| 2026-02 | 352 | 65 | 14 | 78 |
| 2026-03 | 412 | 84 | 26 | 87 |
| 2026-04 | 389 | 78 | 14 | 96 |
| 2026-05 | 377 | 72 | 27 | 86 |
| 2026-06 | 195 | 44 | 11 | 36 |

## P0-05 — baseline manual de tiempo de resolución

Query: `p0-05-manual-resolution-baseline`

| Campo | Valor |
| --- | --- |
| Fórmula | `resolution_days` sobre terminales Resolved/Closed con valor no nulo |
| Población terminal | 3165 |
| mean_resolution_days | 15.415482 |
| p50_resolution_days | 15.0 |
| p90_resolution_days | 27.0 |
| sla_breach_rate | 0.189889 |

Este baseline es el benchmark cuantitativo del KPI del product brief. El agente
se evaluará contra el mismo periodo/población, no contra un promedio distinto.

## Limitaciones

- La categoría `Transactions` es el proxy de Dispute Transaction Support; no
  hay tabla de disputas bancarias etiquetadas por intención.
- ~75% de reclamos no están en estado terminal; el baseline usa sólo Resolved/Closed.
- No se materializan filas, identificadores de cliente, descripciones ni
  transcripts en Git.
- Los `job_id` de BigQuery viven en el JSON de artefacto local (gitignored).

## Reproducción

```bash
cd data-ingestion-and-processing
source .venv/bin/activate
python scripts/run_phase1_baseline.py \
  --project factored-hackathon --dataset hackathon
```
