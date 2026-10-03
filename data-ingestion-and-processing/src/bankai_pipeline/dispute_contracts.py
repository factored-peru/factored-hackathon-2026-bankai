"""Versioned, PII-safe contracts for Dispute Transaction Support inputs.

These contracts intentionally describe the minimum fields consumed by the
offline workflow. They validate schema shape before any BigQuery or GCS adapter
is invoked and never retain source values in validation reports.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Mapping


@dataclass(frozen=True)
class FieldContract:
    name: str
    required: bool
    accepted_types: tuple[str, ...]


@dataclass(frozen=True)
class TableContract:
    name: str
    version: str
    primary_key: str
    fields: tuple[FieldContract, ...]
    freshness_field: str
    source: str


TRANSACTIONS = TableContract(
    name="transactions",
    version="dispute-transaction-v1",
    primary_key="transaction_id",
    freshness_field="transaction_date",
    source="bigquery_canonical",
    fields=(
        FieldContract("transaction_id", True, ("STRING",)),
        FieldContract("customer_id", True, ("STRING",)),
        FieldContract("transaction_date", True, ("TIMESTAMP", "DATETIME")),
        FieldContract("transaction_status", True, ("STRING",)),
        FieldContract("response_code", False, ("INTEGER", "INT64")),
        FieldContract("is_fraud", False, ("BOOLEAN",)),
        FieldContract("fraud_score", False, ("FLOAT", "FLOAT64", "NUMERIC", "INTEGER", "INT64")),
        FieldContract("amount", True, ("FLOAT", "FLOAT64", "NUMERIC", "INTEGER", "INT64")),
        FieldContract("currency", True, ("STRING",)),
    ),
)

COMPLAINTS = TableContract(
    name="complaints",
    version="dispute-transaction-v1",
    primary_key="complaint_id",
    freshness_field="creation_date",
    source="bigquery_canonical",
    fields=(
        FieldContract("complaint_id", True, ("STRING",)),
        FieldContract("customer_id", True, ("STRING",)),
        FieldContract("creation_date", True, ("TIMESTAMP", "DATETIME")),
        FieldContract("status", True, ("STRING",)),
        FieldContract("priority", False, ("STRING",)),
        FieldContract("category", False, ("STRING",)),
        FieldContract("claimed_amount", False, ("FLOAT", "FLOAT64", "NUMERIC", "INTEGER", "INT64")),
    ),
)

CONTRACTS: Mapping[str, TableContract] = {
    TRANSACTIONS.name: TRANSACTIONS,
    COMPLAINTS.name: COMPLAINTS,
}


@dataclass(frozen=True)
class SchemaValidationReport:
    table: str
    version: str
    valid: bool
    missing_required: tuple[str, ...]
    unexpected_types: tuple[str, ...]


def validate_schema(
    table: str, actual_fields: Mapping[str, str]
) -> SchemaValidationReport:
    """Validate only field names/types; callers must not pass or log row values."""
    contract = CONTRACTS[table]
    missing = tuple(
        field.name
        for field in contract.fields
        if field.required and field.name not in actual_fields
    )
    invalid_types = tuple(
        field.name
        for field in contract.fields
        if field.name in actual_fields
        and actual_fields[field.name].upper() not in field.accepted_types
    )
    return SchemaValidationReport(
        table=contract.name,
        version=contract.version,
        valid=not missing and not invalid_types,
        missing_required=missing,
        unexpected_types=invalid_types,
    )


def profile_quality(
    rows: Iterable[Mapping[str, object]], contract: TableContract
) -> dict[str, object]:
    """Return aggregate quality signals without returning raw or identifying data."""
    total = 0
    nulls = {field.name: 0 for field in contract.fields}
    primary_keys: set[object] = set()
    duplicates = 0
    for row in rows:
        total += 1
        for field in contract.fields:
            if row.get(field.name) is None:
                nulls[field.name] += 1
        key = row.get(contract.primary_key)
        if key in primary_keys:
            duplicates += 1
        else:
            primary_keys.add(key)
    return {
        "table": contract.name,
        "contract_version": contract.version,
        "row_count": total,
        "null_counts": nulls,
        "duplicate_primary_key_count": duplicates,
    }
