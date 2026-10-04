from __future__ import annotations

from pathlib import Path

import pytest

from bankai_pipeline.phase1_baseline import (
    assert_aggregate_safe,
    load_phase1_queries,
    render_markdown_report,
    render_sql,
)


def test_phase1_queries_are_aggregate_safe() -> None:
    queries = load_phase1_queries()
    assert [query.query_id for query in queries] == [
        "p0-01-contact-motive-distribution",
        "p0-02-population-denominator",
        "p0-02-volume-severity-temporality",
        "p0-05-manual-resolution-baseline",
    ]
    for query in queries:
        assert_aggregate_safe(query.sql_template)
        sql = render_sql(
            query.sql_template, project="factored-hackathon", dataset="hackathon"
        )
        body = "\n".join(
            line for line in sql.splitlines() if not line.strip().startswith("--")
        )
        select_list = body.lower().split("from", 1)[0]
        assert "customer_id" not in select_list
        assert "`factored-hackathon.hackathon.complaints`" in sql


def test_phase1_rejects_pii_projection() -> None:
    with pytest.raises(ValueError, match="customer_id"):
        assert_aggregate_safe("SELECT customer_id, COUNT(*) AS n FROM t GROUP BY 1")


def test_markdown_report_omits_identifiers() -> None:
    payload = {
        "generated_at": "2026-10-04T00:00:00Z",
        "project": "factored-hackathon",
        "dataset": "hackathon",
        "timezone": "America/Lima",
        "period_start": "2023-06-17T00:00:00Z",
        "period_end": "2026-06-19T00:00:00Z",
        "population": "complaints.category = 'Transactions'",
        "queries": {
            "p0-01-contact-motive-distribution": {
                "rows": [
                    {
                        "motive": "Cargo no reconocido",
                        "case_type": "Claim",
                        "complaint_count": 10,
                        "share": 1.0,
                    }
                ]
            },
            "p0-02-population-denominator": {
                "rows": [
                    {
                        "population_count": 10,
                        "priority_low": 1,
                        "priority_medium": 2,
                        "priority_high": 3,
                        "priority_critical": 4,
                        "status_open": 1,
                        "status_in_process": 1,
                        "status_escalated": 1,
                        "status_resolved": 1,
                        "status_closed": 1,
                        "status_rejected": 0,
                        "with_reception_channel": 10,
                        "with_origin_interaction": 0,
                    }
                ]
            },
            "p0-02-volume-severity-temporality": {
                "rows": [
                    {
                        "year_month": "2024-01",
                        "volume": 10,
                        "high_or_critical_count": 2,
                        "escalated_count": 1,
                        "sla_breached_count": 1,
                    }
                ]
            },
            "p0-05-manual-resolution-baseline": {
                "rows": [
                    {
                        "terminal_population": 5,
                        "mean_resolution_days": 15.0,
                        "p50_resolution_days": 14.0,
                        "p90_resolution_days": 27.0,
                        "sla_breach_rate": 0.2,
                    }
                ]
            },
        },
    }
    markdown = render_markdown_report(payload)
    assert "p50_resolution_days" in markdown
    assert "identificadores de cliente" in markdown
    assert "Cargo no reconocido" in markdown
    assert Path("queries/phase1").name == "phase1"
