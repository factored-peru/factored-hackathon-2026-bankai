"""Deterministic, aggregate-safe preparation primitives for ADR 0020.

The functions in this module operate on an already authorized in-memory frame.
They do not read cloud sources or write BigQuery.  The future ``prepare``
worker will call the same primitives after the ingestion worker has accepted a
``verified/`` object and recorded its ledger entry.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass
from typing import Literal

import pandas as pd

from bankai_pipeline.dispute_contracts import TableContract


class PreparationError(ValueError):
    """Raised before a partially prepared population can be published."""


ImputationKind = Literal["categorical", "numeric"]


@dataclass(frozen=True)
class ImputationRule:
    column: str
    kind: ImputationKind
    group_by: tuple[str, ...] = ()


@dataclass(frozen=True)
class PreparedPopulation:
    frame: pd.DataFrame
    manifest: Mapping[str, object]


def prepare_population(
    frame: pd.DataFrame,
    contract: TableContract,
    *,
    rules: Sequence[ImputationRule],
) -> PreparedPopulation:
    """Deduplicate and impute a permitted population deterministically.

    Targets, primary keys and freshness timestamps are never imputed.  Every
    imputed value has a boolean companion column so downstream KDD/modeling can
    preserve absence as signal.  The manifest deliberately contains counts and
    rules only, never row values or identifiers.
    """

    _require_columns(frame, contract, rules)
    _reject_invalid_rules(contract, rules)
    working = frame.copy(deep=True)
    before = len(working)
    working["__bankai_source_order"] = range(before)
    freshness = pd.to_datetime(working[contract.freshness_field], errors="coerce", utc=True)
    if freshness.isna().any():
        raise PreparationError(f"{contract.name}: freshness field is invalid or missing")
    working["__bankai_freshness"] = freshness
    if working[contract.primary_key].isna().any():
        raise PreparationError(f"{contract.name}: primary key cannot be null")

    # Stable source order resolves equal timestamps without relying on platform
    # dataframe ordering.  The latest observed source record wins.
    working = working.sort_values(
        [contract.primary_key, "__bankai_freshness", "__bankai_source_order"],
        kind="stable",
    ).drop_duplicates(subset=[contract.primary_key], keep="last")
    deduplicated = before - len(working)

    imputation_counts: dict[str, int] = {}
    applied_rules: list[dict[str, object]] = []
    for rule in rules:
        normalized = _normalize_column(working[rule.column], rule.kind)
        missing = normalized.isna()
        flag = f"{rule.column}_was_imputed"
        working[flag] = missing.astype(bool)
        if rule.kind == "numeric":
            filled = _impute_numeric(working, normalized, rule.group_by)
        else:
            filled = _impute_categorical(working, normalized, rule.group_by)
        working[rule.column] = filled
        imputation_counts[rule.column] = int(missing.sum())
        applied_rules.append(
            {
                "column": rule.column,
                "kind": rule.kind,
                "group_by": list(rule.group_by),
                "fallback": "global_median" if rule.kind == "numeric" else "UNKNOWN",
            }
        )

    working = working.drop(columns=["__bankai_source_order", "__bankai_freshness"])
    return PreparedPopulation(
        frame=working.reset_index(drop=True),
        manifest={
            "table": contract.name,
            "contract_version": contract.version,
            "source_row_count": int(before),
            "output_row_count": int(len(working)),
            "deduplicated_row_count": int(deduplicated),
            "imputation_counts": imputation_counts,
            "rules": applied_rules,
            "contains_source_values": False,
        },
    )


def default_imputation_rules(contract: TableContract) -> tuple[ImputationRule, ...]:
    """Return only non-target feature rules approved for the initial workflow."""

    by_table = {
        "transactions": (
            ImputationRule("transaction_type", "categorical"),
            ImputationRule("transaction_category", "categorical"),
            ImputationRule("channel", "categorical"),
            ImputationRule("merchant_category", "categorical"),
            ImputationRule("currency", "categorical"),
            ImputationRule("amount", "numeric", ("currency",)),
            ImputationRule("fraud_score", "numeric", ("transaction_category",)),
        ),
        "complaints": (
            ImputationRule("case_type", "categorical"),
            ImputationRule("category", "categorical"),
            ImputationRule("subcategory", "categorical", ("category",)),
            ImputationRule("reception_channel", "categorical"),
            ImputationRule("priority", "categorical"),
            ImputationRule("claimed_amount", "numeric", ("currency",)),
        ),
        "call_center_interactions": (
            ImputationRule("interaction_type", "categorical"),
            ImputationRule("channel", "categorical"),
        ),
    }
    return by_table.get(contract.name, ())


def preparation_dry_run_plan(contracts: Iterable[TableContract]) -> dict[str, object]:
    """Describe the future raw-to-cur job without creating cloud resources."""

    tables = []
    for contract in contracts:
        rules = default_imputation_rules(contract)
        tables.append(
            {
                "table": contract.name,
                "contract_version": contract.version,
                "source": contract.source,
                "freshness_field": contract.freshness_field,
                "stages": ["raw", "stg", "aux", "cur"],
                "imputation_rules": [
                    {"column": rule.column, "kind": rule.kind, "group_by": list(rule.group_by)}
                    for rule in rules
                ],
            }
        )
    return {
        "stage": "prepare",
        "mode": "dry-run",
        "tables": tables,
        "cloud_execution": "not_requested",
        "requires_verified_object_and_ingestion_ledger": True,
    }


def _require_columns(
    frame: pd.DataFrame, contract: TableContract, rules: Iterable[ImputationRule]
) -> None:
    required = {contract.primary_key, contract.freshness_field}
    required.update(rule.column for rule in rules)
    required.update(group for rule in rules for group in rule.group_by)
    missing = sorted(required - set(frame.columns))
    if missing:
        raise PreparationError(f"{contract.name}: required preparation columns missing: {missing}")


def _reject_invalid_rules(contract: TableContract, rules: Iterable[ImputationRule]) -> None:
    available = {field.name for field in contract.fields}
    protected = {contract.primary_key, contract.freshness_field}
    seen: set[str] = set()
    for rule in rules:
        if rule.column not in available or rule.column in protected:
            raise PreparationError(f"{contract.name}: imputation is not allowed for {rule.column}")
        if rule.column in seen:
            raise PreparationError(f"{contract.name}: duplicate imputation rule for {rule.column}")
        seen.add(rule.column)


def _normalize_column(values: pd.Series, kind: ImputationKind) -> pd.Series:
    if kind == "numeric":
        return pd.to_numeric(values, errors="coerce")
    normalized = values.astype("string").str.strip().str.upper()
    return normalized.mask(normalized.isna() | normalized.eq(""))


def _impute_numeric(frame: pd.DataFrame, values: pd.Series, groups: tuple[str, ...]) -> pd.Series:
    result = values.copy()
    if groups:
        group_median = frame.assign(__bankai_value=values).groupby(list(groups), dropna=False)["__bankai_value"].transform("median")
        result = result.fillna(group_median)
    median = result.median(skipna=True)
    if pd.isna(median):
        raise PreparationError("numeric imputation has no observed value for its global median")
    return result.fillna(median)


def _impute_categorical(frame: pd.DataFrame, values: pd.Series, groups: tuple[str, ...]) -> pd.Series:
    result = values.copy()
    if groups:
        modes = (
            frame.assign(__bankai_value=values)
            .groupby(list(groups), dropna=False)["__bankai_value"]
            .transform(_stable_mode)
        )
        result = result.fillna(modes)
    return result.fillna("UNKNOWN")


def _stable_mode(values: pd.Series) -> str | None:
    observed = values.dropna()
    if observed.empty:
        return None
    counts = observed.value_counts()
    winners = sorted(str(value) for value, count in counts.items() if count == counts.max())
    return winners[0]
