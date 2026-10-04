"""Versioned Phase 1 BigQuery aggregates for P0-01 / P0-02 / P0-05.

Queries are read-only, aggregate-only, and never select customer_id,
descriptions, transcripts or other PII columns.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Protocol

QUERY_IDS = (
    "p0-01-contact-motive-distribution",
    "p0-02-population-denominator",
    "p0-02-volume-severity-temporality",
    "p0-05-manual-resolution-baseline",
)

DEFAULT_PERIOD_START = "2023-06-17T00:00:00Z"
DEFAULT_PERIOD_END = "2026-06-19T00:00:00Z"
DEFAULT_TIMEZONE = "America/Lima"
FORBIDDEN_SELECT_MARKERS = (
    "customer_id",
    "description",
    "resolution",
    "assigned_agent_id",
    "agent_id",
    "transcript",
    "email",
    "phone",
    "pan",
)


class BigQueryJobClient(Protocol):
    def query(self, sql: str, job_config: Any) -> Any: ...


@dataclass(frozen=True)
class Phase1Query:
    query_id: str
    sql_path: Path
    sql_template: str


def queries_dir() -> Path:
    return Path(__file__).resolve().parents[2] / "queries" / "phase1"


def load_phase1_queries(directory: Path | None = None) -> list[Phase1Query]:
    root = directory or queries_dir()
    loaded: list[Phase1Query] = []
    for query_id in QUERY_IDS:
        path = root / f"{query_id}.sql"
        text = path.read_text(encoding="utf-8")
        assert_aggregate_safe(text)
        loaded.append(Phase1Query(query_id=query_id, sql_path=path, sql_template=text))
    return loaded


def assert_aggregate_safe(sql: str) -> None:
    """Reject accidental PII projections in versioned SQL."""
    body = "\n".join(
        line for line in sql.splitlines() if not line.strip().startswith("--")
    )
    lowered = body.lower()
    if "group by" not in lowered and "count(" not in lowered:
        raise ValueError("phase1 SQL must be aggregate-only")
    select_match = re.search(
        r"select\s+(.*?)\s+from\s+", lowered, flags=re.DOTALL | re.IGNORECASE
    )
    if not select_match:
        raise ValueError("phase1 SQL must contain a SELECT ... FROM clause")
    select_list = select_match.group(1)
    for marker in FORBIDDEN_SELECT_MARKERS:
        if re.search(rf"\b{re.escape(marker)}\b", select_list):
            raise ValueError(f"phase1 SQL must not project {marker}")


def render_sql(template: str, *, project: str, dataset: str) -> str:
    return template.format(project=project, dataset=dataset)


def run_phase1_queries(
    client: BigQueryJobClient,
    *,
    project: str,
    dataset: str,
    period_start: str = DEFAULT_PERIOD_START,
    period_end: str = DEFAULT_PERIOD_END,
    directory: Path | None = None,
) -> dict[str, Any]:
    from google.cloud import bigquery

    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("period_start", "STRING", period_start),
            bigquery.ScalarQueryParameter("period_end", "STRING", period_end),
        ],
        maximum_bytes_billed=200_000_000,
        use_query_cache=True,
        labels={"component": "phase1_baseline", "workflow": "dispute_support"},
    )
    results: dict[str, Any] = {
        "generated_at": datetime.now(UTC).isoformat().replace("+00:00", "Z"),
        "project": project,
        "dataset": dataset,
        "timezone": DEFAULT_TIMEZONE,
        "period_start": period_start,
        "period_end": period_end,
        "population": "complaints.category = 'Transactions'",
        "queries": {},
    }
    for query in load_phase1_queries(directory):
        sql = render_sql(query.sql_template, project=project, dataset=dataset)
        job = client.query(sql, job_config=job_config)
        rows = [dict(row.items()) for row in job.result()]
        sanitized = [_sanitize_row(row) for row in rows]
        results["queries"][query.query_id] = {
            "query_id": query.query_id,
            "sql_path": str(
                query.sql_path.relative_to(Path(__file__).resolve().parents[2])
            ),
            "job_id": getattr(job, "job_id", None),
            "row_count": len(sanitized),
            "rows": sanitized,
        }
    return results


def _sanitize_row(row: dict[str, Any]) -> dict[str, Any]:
    out: dict[str, Any] = {}
    for key, value in row.items():
        if hasattr(value, "isoformat"):
            out[key] = value.isoformat()
        elif isinstance(value, (int, float, str, bool)) or value is None:
            out[key] = value
        else:
            out[key] = str(value)
    return out


def write_phase1_artifacts(
    payload: dict[str, Any],
    *,
    json_path: Path,
    markdown_path: Path,
) -> None:
    json_path.parent.mkdir(parents=True, exist_ok=True)
    markdown_path.parent.mkdir(parents=True, exist_ok=True)
    json_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
        encoding="utf-8",
    )
    markdown_path.write_text(render_markdown_report(payload), encoding="utf-8")


def render_markdown_report(payload: dict[str, Any]) -> str:
    queries = payload["queries"]
    motives = queries["p0-01-contact-motive-distribution"]["rows"]
    denom = queries["p0-02-population-denominator"]["rows"][0]
    temporal = queries["p0-02-volume-severity-temporality"]["rows"]
    baseline = queries["p0-05-manual-resolution-baseline"]["rows"][0]

    motive_lines = [
        f"| {row['motive']} | {row['case_type']} | {row['complaint_count']} | {row['share']} |"
        for row in motives[:20]
    ]
    temporal_lines = [
        (
            f"| {row['year_month']} | {row['volume']} | {row['high_or_critical_count']} | "
            f"{row['escalated_count']} | {row['sla_breached_count']} |"
        )
        for row in temporal
    ]

    return f"""# Fase 1 — evidencia del problema y baseline manual

Snapshot agregado sobre BigQuery. Sin PII, textos ni IDs de cliente.

## Metadatos

| Campo | Valor |
| --- | --- |
| generated_at | {payload["generated_at"]} |
| project | `{payload["project"]}` |
| dataset | `{payload["dataset"]}` |
| timezone | {payload["timezone"]} |
| period | `{payload["period_start"]}` → `{payload["period_end"]}` |
| population | {payload["population"]} |

## P0-01 — distribución de motivos

Query: `p0-01-contact-motive-distribution`

| motive | case_type | count | share |
| --- | --- | ---: | ---: |
{chr(10).join(motive_lines)}

## P0-02 — denominadores y severidad

Query: `p0-02-population-denominator`

- Población Transactions: **{denom["population_count"]}**
- Prioridad Low/Medium/High/Critical: {denom["priority_low"]} / {denom["priority_medium"]} / {denom["priority_high"]} / {denom["priority_critical"]}
- Estados Open / In Process / Escalated / Resolved / Closed / Rejected: {denom["status_open"]} / {denom["status_in_process"]} / {denom["status_escalated"]} / {denom["status_resolved"]} / {denom["status_closed"]} / {denom["status_rejected"]}
- Con canal de recepción: {denom["with_reception_channel"]}
- Con `origin_interaction_id`: {denom["with_origin_interaction"]} (limitación: vínculo interacción→reclamo incompleto)

### Temporalidad mensual

Query: `p0-02-volume-severity-temporality`

| year_month | volume | high_or_critical | escalated | sla_breached |
| --- | ---: | ---: | ---: | ---: |
{chr(10).join(temporal_lines)}

## P0-05 — baseline manual de tiempo de resolución

Query: `p0-05-manual-resolution-baseline`

| Campo | Valor |
| --- | --- |
| Fórmula | `resolution_days` sobre terminales Resolved/Closed con valor no nulo |
| Población terminal | {baseline["terminal_population"]} |
| mean_resolution_days | {baseline["mean_resolution_days"]} |
| p50_resolution_days | {baseline["p50_resolution_days"]} |
| p90_resolution_days | {baseline["p90_resolution_days"]} |
| sla_breach_rate | {baseline["sla_breach_rate"]} |

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
python scripts/run_phase1_baseline.py \\
  --project factored-hackathon --dataset hackathon
```
"""
