"""Authorized canonical prepare: hackathon → stg → aux → cur in BigQuery.

This path materializes contract tables from an approved analytical snapshot
(``bigquery_canonical``) without waiting for the ADR 0020 raw ingest worker.
It never logs row values, free-text fields, or identifiers.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence

from bankai_pipeline.dispute_contracts import CONTRACTS, TableContract, validate_schema
from bankai_pipeline.lineage import RUN_ID, SourceSnapshot, build_lineage_manifest
from bankai_pipeline.preparation import ImputationRule, default_imputation_rules

IDENTIFIER = re.compile(r"^[A-Za-z_][A-Za-z0-9_]{0,1023}$")
PROJECT_ID = re.compile(r"^[a-z][a-z0-9-]{4,61}[a-z0-9]$")
DEFAULT_MAXIMUM_BYTES_BILLED = 50_000_000_000


class CanonicalPrepareError(ValueError):
    """Fail-closed prepare errors before partial curated layers are trusted."""


@dataclass(frozen=True)
class CanonicalPrepareConfig:
    project: str
    source_dataset: str
    stg_dataset: str
    aux_dataset: str
    cur_dataset: str
    run_id: str
    output_dir: Path
    maximum_bytes_billed: int = DEFAULT_MAXIMUM_BYTES_BILLED
    location: str = "us-central1"


def build_config(
    *,
    project: str,
    run_id: str,
    source_dataset: str = "hackathon",
    stg_dataset: str = "stg",
    aux_dataset: str = "aux",
    cur_dataset: str = "cur",
    output_dir: Path | str = Path("artifacts/prepare"),
    maximum_bytes_billed: int = DEFAULT_MAXIMUM_BYTES_BILLED,
    location: str = "us-central1",
) -> CanonicalPrepareConfig:
    if not RUN_ID.fullmatch(run_id):
        raise CanonicalPrepareError("run_id must be opaque and match the allowed format")
    if not PROJECT_ID.fullmatch(project):
        raise CanonicalPrepareError("invalid project identifier")
    for name, value in {
        "source_dataset": source_dataset,
        "stg_dataset": stg_dataset,
        "aux_dataset": aux_dataset,
        "cur_dataset": cur_dataset,
    }.items():
        if not IDENTIFIER.fullmatch(value):
            raise CanonicalPrepareError(f"invalid {name} identifier")
    if maximum_bytes_billed <= 0:
        raise CanonicalPrepareError("maximum_bytes_billed must be positive")
    return CanonicalPrepareConfig(
        project=project,
        source_dataset=source_dataset,
        stg_dataset=stg_dataset,
        aux_dataset=aux_dataset,
        cur_dataset=cur_dataset,
        run_id=run_id,
        output_dir=Path(output_dir),
        maximum_bytes_billed=maximum_bytes_billed,
        location=location,
    )


def canonical_prepare_dry_run_plan(config: CanonicalPrepareConfig) -> dict[str, object]:
    """Describe SQL stages and rules without creating BigQuery jobs."""

    tables = []
    for contract in CONTRACTS.values():
        rules = default_imputation_rules(contract)
        tables.append(
            {
                "table": contract.name,
                "contract_version": contract.version,
                "source": f"{config.project}.{config.source_dataset}.{contract.name}",
                "stg": f"{config.project}.{config.stg_dataset}.{contract.name}",
                "aux": f"{config.project}.{config.aux_dataset}.{contract.name}",
                "cur": f"{config.project}.{config.cur_dataset}.{contract.name}",
                "freshness_field": contract.freshness_field,
                "primary_key": contract.primary_key,
                "projected_fields": [field.name for field in contract.fields],
                "imputation_rules": [
                    {"column": rule.column, "kind": rule.kind, "group_by": list(rule.group_by)}
                    for rule in rules
                ],
                "sql": {
                    "stg": stg_sql(config, contract),
                    "aux": aux_sql(config, contract),
                    "cur": cur_sql(config, contract, rules),
                },
            }
        )
    return {
        "stage": "prepare",
        "mode": "dry-run",
        "prepare_mode": "canonical",
        "run_id": config.run_id,
        "source_system": "bigquery_canonical",
        "tables": tables,
        "cloud_execution": "not_requested",
        "requires_verified_object_and_ingestion_ledger": False,
        "notes": (
            "Authorized canonical snapshot path until ADR 0020 raw ingest is complete; "
            "does not replace transfer/load."
        ),
    }


def stg_sql(config: CanonicalPrepareConfig, contract: TableContract) -> str:
    projections = ",\n    ".join(
        f"{_cast_expr(field.name, field.accepted_types)} AS `{field.name}`"
        for field in contract.fields
    )
    source = _fqn(config.project, config.source_dataset, contract.name)
    target = _fqn(config.project, config.stg_dataset, contract.name)
    return f"""
CREATE OR REPLACE TABLE `{target}` AS
SELECT
    {projections}
FROM (
  SELECT
    {projections},
    ROW_NUMBER() OVER (
      PARTITION BY `{contract.primary_key}`
      ORDER BY `{contract.freshness_field}` DESC
    ) AS __bankai_rn
  FROM `{source}`
  WHERE `{contract.primary_key}` IS NOT NULL
    AND `{contract.freshness_field}` IS NOT NULL
)
WHERE __bankai_rn = 1
""".strip()


def aux_sql(config: CanonicalPrepareConfig, contract: TableContract) -> str:
    rules = default_imputation_rules(contract)
    base_cols = ",\n    ".join(f"`{field.name}`" for field in contract.fields)
    null_flags = ",\n    ".join(
        f"(`{rule.column}` IS NULL) AS `{rule.column}_is_null`" for rule in rules
    )
    select_body = base_cols if not null_flags else f"{base_cols},\n    {null_flags}"
    source = _fqn(config.project, config.stg_dataset, contract.name)
    target = _fqn(config.project, config.aux_dataset, contract.name)
    return f"""
CREATE OR REPLACE TABLE `{target}` AS
SELECT
    {select_body}
FROM `{source}`
""".strip()


def cur_sql(
    config: CanonicalPrepareConfig,
    contract: TableContract,
    rules: Sequence[ImputationRule] | None = None,
) -> str:
    rules = tuple(rules if rules is not None else default_imputation_rules(contract))
    source = _fqn(config.project, config.aux_dataset, contract.name)
    target = _fqn(config.project, config.cur_dataset, contract.name)
    rule_columns = {rule.column for rule in rules}
    base_cols = ", ".join(f"`{field.name}`" for field in contract.fields)

    if not rules:
        return f"""
CREATE OR REPLACE TABLE `{target}` AS
SELECT {base_cols}
FROM `{source}`
""".strip()

    normalized_exprs: list[str] = []
    for field in contract.fields:
        if field.name in rule_columns:
            continue
        normalized_exprs.append(f"`{field.name}`")
    for rule in rules:
        normalized_exprs.append(_normalized_rule_select(rule))

    ctes = [
        f"""normalized AS (
  SELECT
    {", ".join(normalized_exprs)}
  FROM `{source}`
)"""
    ]
    previous = "normalized"
    for index, rule in enumerate(rules):
        step = f"step_{index}"
        mode_name = f"{rule.column}__mode_{index}"
        carried = [f"s.`{field.name}`" for field in contract.fields if field.name != rule.column]
        for earlier in rules[:index]:
            carried.append(f"s.`{earlier.column}_was_imputed`")
        if rule.kind == "categorical":
            ctes.append(_mode_cte_from(previous, rule, mode_name))
            join = (
                f"LEFT JOIN `{mode_name}` AS m USING ({_using_cols(rule)})"
                if rule.group_by
                else f"LEFT JOIN `{mode_name}` AS m ON TRUE"
            )
            ctes.append(
                f"""`{step}` AS (
  SELECT
    {", ".join(carried)},
    COALESCE(s.`{rule.column}`, m.`mode_value`, 'UNKNOWN') AS `{rule.column}`,
    (s.`{rule.column}` IS NULL) AS `{rule.column}_was_imputed`
  FROM `{previous}` AS s
  {join}
)"""
            )
        else:
            partition = (
                f"PARTITION BY {', '.join(f's.`{g}`' for g in rule.group_by)}"
                if rule.group_by
                else ""
            )
            group_median = (
                f"PERCENTILE_CONT(s.`{rule.column}`, 0.5) OVER ({partition})"
                if rule.group_by
                else "CAST(NULL AS FLOAT64)"
            )
            global_median = f"PERCENTILE_CONT(s.`{rule.column}`, 0.5) OVER ()"
            ctes.append(
                f"""`{step}` AS (
  SELECT
    {", ".join(carried)},
    COALESCE(s.`{rule.column}`, {group_median}, {global_median}) AS `{rule.column}`,
    (s.`{rule.column}` IS NULL) AS `{rule.column}_was_imputed`
  FROM `{previous}` AS s
)"""
            )
        previous = step

    return f"""
CREATE OR REPLACE TABLE `{target}` AS
WITH
{",\n".join(ctes)}
SELECT * FROM `{previous}`
""".strip()


def _mode_cte_from(source_cte: str, rule: ImputationRule, cte_name: str) -> str:
    if rule.group_by:
        group_cols = ", ".join(f"`{group}`" for group in rule.group_by)
        return f"""
`{cte_name}` AS (
  SELECT * EXCEPT(__bankai_mode_rn) FROM (
    SELECT
      {group_cols},
      `{rule.column}` AS `mode_value`,
      ROW_NUMBER() OVER (
        PARTITION BY {group_cols}
        ORDER BY COUNT(*) DESC, `{rule.column}` ASC
      ) AS __bankai_mode_rn
    FROM `{source_cte}`
    WHERE `{rule.column}` IS NOT NULL
    GROUP BY {group_cols}, `{rule.column}`
  )
  WHERE __bankai_mode_rn = 1
)
""".strip()
    return f"""
`{cte_name}` AS (
  SELECT * EXCEPT(__bankai_mode_rn) FROM (
    SELECT
      `{rule.column}` AS `mode_value`,
      ROW_NUMBER() OVER (
        ORDER BY COUNT(*) DESC, `{rule.column}` ASC
      ) AS __bankai_mode_rn
    FROM `{source_cte}`
    WHERE `{rule.column}` IS NOT NULL
    GROUP BY `{rule.column}`
  )
  WHERE __bankai_mode_rn = 1
)
""".strip()


def profile_sql(config: CanonicalPrepareConfig, contract: TableContract) -> str:
    source = _fqn(config.project, config.source_dataset, contract.name)
    null_exprs = ",\n  ".join(
        f"COUNTIF(`{field.name}` IS NULL) AS `null_{field.name}`" for field in contract.fields
    )
    return f"""
SELECT
  COUNT(*) AS row_count,
  COUNT(DISTINCT `{contract.primary_key}`) AS distinct_primary_keys,
  COUNT(*) - COUNT(DISTINCT `{contract.primary_key}`) AS duplicate_primary_key_count,
  MIN(`{contract.freshness_field}`) AS freshness_min,
  MAX(`{contract.freshness_field}`) AS freshness_max,
  {null_exprs}
FROM `{source}`
""".strip()


def validate_source_contracts(client: Any, config: CanonicalPrepareConfig) -> list[dict[str, object]]:
    reports: list[dict[str, object]] = []
    for contract in CONTRACTS.values():
        table = client.get_table(_fqn(config.project, config.source_dataset, contract.name))
        actual_fields = {field.name: field.field_type for field in table.schema}
        report = validate_schema(contract.name, actual_fields)
        if not report.valid:
            raise CanonicalPrepareError(
                f"schema contract rejected {contract.name}: "
                f"missing={report.missing_required} unexpected_types={report.unexpected_types}"
            )
        reports.append(
            {
                "table": report.table,
                "contract_version": report.version,
                "valid": report.valid,
                "field_count": len(actual_fields),
                "schema_hash": _schema_hash(actual_fields),
            }
        )
    return reports


def run_source_profiles(client: Any, config: CanonicalPrepareConfig) -> list[dict[str, object]]:
    profiles: list[dict[str, object]] = []
    for contract in CONTRACTS.values():
        rows = list(_query(client, config, profile_sql(config, contract)))
        if len(rows) != 1:
            raise CanonicalPrepareError(f"profile query for {contract.name} returned {len(rows)} rows")
        row = dict(rows[0])
        null_counts = {
            field.name: int(row.pop(f"null_{field.name}", 0) or 0) for field in contract.fields
        }
        freshness_min = row.get("freshness_min")
        freshness_max = row.get("freshness_max")
        profiles.append(
            {
                "table": contract.name,
                "contract_version": contract.version,
                "row_count": int(row.get("row_count") or 0),
                "distinct_primary_keys": int(row.get("distinct_primary_keys") or 0),
                "duplicate_primary_key_count": int(row.get("duplicate_primary_key_count") or 0),
                "freshness_min": freshness_min.isoformat() if hasattr(freshness_min, "isoformat") else freshness_min,
                "freshness_max": freshness_max.isoformat() if hasattr(freshness_max, "isoformat") else freshness_max,
                "null_counts": null_counts,
                "contains_source_values": False,
            }
        )
    return profiles


def run_canonical_prepare(client: Any, config: CanonicalPrepareConfig) -> dict[str, object]:
    """Validate, profile, materialize stg/aux/cur, and persist sanitized manifests."""

    contract_reports = validate_source_contracts(client, config)
    profiles = run_source_profiles(client, config)
    for dataset_id in (config.stg_dataset, config.aux_dataset, config.cur_dataset):
        _ensure_dataset(client, config.project, dataset_id, config.location)

    job_ids: dict[str, list[str]] = {"stg": [], "aux": [], "cur": []}
    table_counts: dict[str, dict[str, int]] = {}
    for contract in CONTRACTS.values():
        rules = default_imputation_rules(contract)
        stg_job = _run_ddl(client, config, stg_sql(config, contract), f"stg-{contract.name}")
        aux_job = _run_ddl(client, config, aux_sql(config, contract), f"aux-{contract.name}")
        cur_job = _run_ddl(client, config, cur_sql(config, contract, rules), f"cur-{contract.name}")
        job_ids["stg"].append(stg_job)
        job_ids["aux"].append(aux_job)
        job_ids["cur"].append(cur_job)
        source_rows = next(p["row_count"] for p in profiles if p["table"] == contract.name)
        cur_rows = int(client.get_table(_fqn(config.project, config.cur_dataset, contract.name)).num_rows or 0)
        stg_rows = int(client.get_table(_fqn(config.project, config.stg_dataset, contract.name)).num_rows or 0)
        table_counts[contract.name] = {
            "source_row_count": int(source_rows),
            "stg_row_count": stg_rows,
            "cur_row_count": cur_rows,
            "deduplicated_row_count": max(int(source_rows) - stg_rows, 0),
        }

    snapshots = []
    for report, profile in zip(contract_reports, profiles, strict=True):
        snapshots.append(
            SourceSnapshot(
                source_system="bigquery_canonical",
                object_hash=str(report["schema_hash"]),
                generation=config.source_dataset,
                schema_version=str(report["contract_version"]),
                row_count=int(profile["row_count"]),
                watermark=str(profile["freshness_max"] or ""),
            )
        )
    lineage = build_lineage_manifest(
        run_id=config.run_id,
        stage="prepare",
        inputs=snapshots,
        transformations=(
            "validate_schema_v1",
            "aggregate_profile_v1",
            "project_dedupe_stg_v1",
            "quality_flags_aux_v1",
            "impute_cur_v1",
        ),
        output_version="cur-v1",
    )
    run_manifest = {
        "schema_version": "bankai-canonical-prepare-v1",
        "run_id": config.run_id,
        "prepare_mode": "canonical",
        "project": config.project,
        "source_dataset": config.source_dataset,
        "stg_dataset": config.stg_dataset,
        "aux_dataset": config.aux_dataset,
        "cur_dataset": config.cur_dataset,
        "contracts": contract_reports,
        "profiles": profiles,
        "table_counts": table_counts,
        "job_ids": job_ids,
        "imputation_rules": {
            name: [
                {"column": rule.column, "kind": rule.kind, "group_by": list(rule.group_by)}
                for rule in default_imputation_rules(contract)
            ]
            for name, contract in CONTRACTS.items()
        },
        "lineage": lineage,
        "contains_source_values": False,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    _write_local_manifest(config, run_manifest)
    _write_preparation_runs_table(client, config, run_manifest)
    return run_manifest


def sql_imputation_markers(rules: Sequence[ImputationRule]) -> dict[str, object]:
    """Markers expected in curated SQL for parity tests."""

    return {
        "was_imputed_columns": [f"{rule.column}_was_imputed" for rule in rules],
        "categorical_columns": [rule.column for rule in rules if rule.kind == "categorical"],
        "numeric_columns": [rule.column for rule in rules if rule.kind == "numeric"],
    }


def _normalized_rule_select(rule: ImputationRule) -> str:
    if rule.kind == "numeric":
        return f"SAFE_CAST(`{rule.column}` AS FLOAT64) AS `{rule.column}`"
    return (
        f"NULLIF(UPPER(TRIM(CAST(`{rule.column}` AS STRING))), '') AS `{rule.column}`"
    )


def _using_cols(rule: ImputationRule) -> str:
    return ", ".join(f"`{group}`" for group in rule.group_by)


def _cast_expr(name: str, accepted_types: Sequence[str]) -> str:
    upper = {item.upper() for item in accepted_types}
    if upper & {"TIMESTAMP", "DATETIME"}:
        return f"SAFE_CAST(`{name}` AS TIMESTAMP)"
    if upper & {"BOOLEAN", "BOOL"}:
        return f"SAFE_CAST(`{name}` AS BOOL)"
    if upper & {"FLOAT", "FLOAT64", "NUMERIC"} and not (upper & {"INTEGER", "INT64"}):
        return f"SAFE_CAST(`{name}` AS FLOAT64)"
    if upper <= {"INTEGER", "INT64"} or (upper & {"INTEGER", "INT64"} and not (upper & {"FLOAT", "FLOAT64", "NUMERIC"})):
        return f"SAFE_CAST(`{name}` AS INT64)"
    if upper & {"FLOAT", "FLOAT64", "NUMERIC", "INTEGER", "INT64"}:
        return f"SAFE_CAST(`{name}` AS FLOAT64)"
    return f"CAST(`{name}` AS STRING)"


def _fqn(project: str, dataset: str, table: str) -> str:
    return f"{project}.{dataset}.{table}"


def _schema_hash(fields: Mapping[str, str]) -> str:
    payload = json.dumps(dict(sorted((k, v.upper()) for k, v in fields.items())), separators=(",", ":"))
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _ensure_dataset(client: Any, project: str, dataset_id: str, location: str) -> None:
    from google.cloud import bigquery

    dataset_ref = bigquery.Dataset(f"{project}.{dataset_id}")
    dataset_ref.location = location
    client.create_dataset(dataset_ref, exists_ok=True)


def _run_ddl(client: Any, config: CanonicalPrepareConfig, sql: str, label: str) -> str:
    from google.cloud import bigquery

    job = client.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            maximum_bytes_billed=config.maximum_bytes_billed,
            use_query_cache=False,
            labels={"component": "prepare", "operation": label[:63]},
        ),
    )
    job.result()
    return str(job.job_id)


def _query(client: Any, config: CanonicalPrepareConfig, sql: str) -> Sequence[Mapping[str, object]]:
    from google.cloud import bigquery

    job = client.query(
        sql,
        job_config=bigquery.QueryJobConfig(
            maximum_bytes_billed=config.maximum_bytes_billed,
            use_query_cache=False,
            labels={"component": "prepare", "operation": "profile"},
        ),
    )
    return list(job.result())


def _write_local_manifest(config: CanonicalPrepareConfig, manifest: Mapping[str, object]) -> None:
    destination = config.output_dir / config.run_id
    destination.mkdir(parents=True, exist_ok=True)
    path = destination / "prepare-manifest.json"
    path.write_text(json.dumps(manifest, ensure_ascii=False, sort_keys=True, indent=2) + "\n", encoding="utf-8")


def _write_preparation_runs_table(
    client: Any, config: CanonicalPrepareConfig, manifest: Mapping[str, object]
) -> None:
    from google.cloud import bigquery

    table_id = _fqn(config.project, config.cur_dataset, "preparation_runs")
    schema = [
        bigquery.SchemaField("run_id", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("created_at", "TIMESTAMP", mode="REQUIRED"),
        bigquery.SchemaField("prepare_mode", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("source_dataset", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("manifest_json", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("content_hash", "STRING", mode="REQUIRED"),
        bigquery.SchemaField("contains_source_values", "BOOL", mode="REQUIRED"),
    ]
    table = bigquery.Table(table_id, schema=schema)
    client.create_table(table, exists_ok=True)
    lineage = manifest["lineage"]
    assert isinstance(lineage, Mapping)
    row = {
        "run_id": config.run_id,
        "created_at": manifest["created_at"],
        "prepare_mode": "canonical",
        "source_dataset": config.source_dataset,
        "manifest_json": json.dumps(manifest, ensure_ascii=False, sort_keys=True, separators=(",", ":")),
        "content_hash": lineage["content_hash"],
        "contains_source_values": False,
    }
    errors = client.insert_rows_json(table_id, [row])
    if errors:
        raise CanonicalPrepareError(f"failed to write preparation_runs metadata: {errors}")
