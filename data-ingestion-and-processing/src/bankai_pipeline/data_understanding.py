"""Aggregate-only data understanding derived from the reference notebook."""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass

import pandas as pd


@dataclass(frozen=True)
class NumericProfile:
    null_count: int
    minimum: float | None
    maximum: float | None
    median: float | None
    q1: float | None
    q3: float | None
    iqr_outlier_count: int


def profile_frame(
    frame: pd.DataFrame,
    *,
    primary_key: str,
    numeric_columns: Iterable[str],
    categorical_columns: Iterable[str],
) -> dict[str, object]:
    """Return only aggregate signals; source values and identifiers are omitted."""
    null_counts = {column: int(frame[column].isna().sum()) for column in frame.columns}
    numeric = {
        column: _profile_numeric(frame[column])
        for column in numeric_columns
        if column in frame.columns
    }
    cardinality = {
        column: int(frame[column].nunique(dropna=True))
        for column in categorical_columns
        if column in frame.columns
    }
    return {
        "row_count": int(len(frame)),
        "duplicate_primary_key_count": int(frame[primary_key].duplicated().sum()),
        "null_counts": null_counts,
        "categorical_cardinality": cardinality,
        "numeric": {column: vars(profile) for column, profile in numeric.items()},
    }


def _profile_numeric(values: pd.Series) -> NumericProfile:
    numeric = pd.to_numeric(values, errors="coerce")
    present = numeric.dropna()
    if present.empty:
        return NumericProfile(int(numeric.isna().sum()), None, None, None, None, None, 0)
    q1 = float(present.quantile(0.25))
    q3 = float(present.quantile(0.75))
    iqr = q3 - q1
    lower, upper = q1 - 1.5 * iqr, q3 + 1.5 * iqr
    return NumericProfile(
        null_count=int(numeric.isna().sum()),
        minimum=float(present.min()),
        maximum=float(present.max()),
        median=float(present.median()),
        q1=q1,
        q3=q3,
        iqr_outlier_count=int(((present < lower) | (present > upper)).sum()),
    )
