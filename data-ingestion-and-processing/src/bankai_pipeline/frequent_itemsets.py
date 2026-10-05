"""Frequent-itemset miners compatible with mlxtend association_rules output.

Eclat (Zaki) and AprioriHybrid (Agrawal/Srikant P487) produce the same
``DataFrame[support, itemsets]`` shape as ``mlxtend.frequent_patterns.apriori``.
"""

from __future__ import annotations

from collections.abc import Iterable, Mapping, Sequence
from itertools import combinations
from math import ceil
from typing import Any

import numpy as np
import pandas as pd


def eclat(
    df: pd.DataFrame,
    min_support: float = 0.5,
    *,
    use_colnames: bool = False,
    max_len: int | None = None,
) -> pd.DataFrame:
    """Mine frequent itemsets with vertical TID-list intersection (Eclat)."""
    if df.empty:
        return _empty_itemsets()
    n_transactions = len(df)
    min_count = max(1, ceil(min_support * n_transactions - 1e-12))
    columns = list(df.columns)
    values = np.ascontiguousarray(df.to_numpy(dtype=bool, copy=False))
    labels = columns if use_colnames else list(range(len(columns)))

    items: list[tuple[Any, np.ndarray]] = []
    for index, label in enumerate(labels):
        mask = values[:, index]
        count = int(mask.sum())
        if count >= min_count:
            items.append((label, np.flatnonzero(mask).astype(np.int32, copy=False)))

    frequent: dict[frozenset[Any], int] = {
        frozenset([label]): int(tids.shape[0]) for label, tids in items
    }
    items.sort(key=lambda pair: (pair[1].shape[0], str(pair[0])))
    _eclat_extend(
        prefix=(),
        items=items,
        min_count=min_count,
        max_len=max_len,
        frequent=frequent,
    )
    return _itemsets_frame(frequent, n_transactions)


def apriori_hybrid(
    df: pd.DataFrame,
    min_support: float = 0.5,
    *,
    use_colnames: bool = False,
    max_len: int | None = None,
    tid_memory_limit_words: int = 50_000_000,
) -> pd.DataFrame:
    """Apriori with P487 switch to TID-list candidate counting (AprioriHybrid)."""
    if df.empty:
        return _empty_itemsets()
    n_transactions = len(df)
    min_count = max(1, ceil(min_support * n_transactions - 1e-12))
    columns = list(df.columns)
    labels = columns if use_colnames else list(range(len(columns)))
    values = np.ascontiguousarray(df.to_numpy(dtype=bool, copy=False))

    item_tids: dict[Any, np.ndarray] = {}
    for index, label in enumerate(labels):
        mask = values[:, index]
        count = int(mask.sum())
        if count >= min_count:
            item_tids[label] = np.flatnonzero(mask).astype(np.int32, copy=False)

    frequent: dict[frozenset[Any], int] = {
        frozenset([item]): int(tids.shape[0]) for item, tids in item_tids.items()
    }
    if max_len == 1 or not item_tids:
        return _itemsets_frame(frequent, n_transactions)

    level = [frozenset([item]) for item in sorted(item_tids, key=str)]
    # P487: after L1 the vertical representation of frequent items already fits
    # for Bankai's <=100k rows (below tid_memory_limit_words), so Hybrid switches
    # to AprioriTid counting for k >= 2.
    _ = tid_memory_limit_words
    k = 2
    while level and (max_len is None or k <= max_len):
        candidates = _apriori_gen(level)
        if not candidates:
            break
        counts = {
            candidate: int(_intersect_item_tids(candidate, item_tids).shape[0])
            for candidate in candidates
        }

        large: list[frozenset[Any]] = []
        for candidate, count in counts.items():
            if count >= min_count:
                frequent[candidate] = count
                large.append(candidate)

        level = sorted(large, key=lambda itemset: tuple(sorted(map(str, itemset))))
        k += 1

    return _itemsets_frame(frequent, n_transactions)


def itemset_keys(itemsets: pd.DataFrame) -> set[frozenset[Any]]:
    if itemsets.empty:
        return set()
    return {frozenset(items) for items in itemsets["itemsets"]}


def _eclat_extend(
    *,
    prefix: Sequence[Any],
    items: Sequence[tuple[Any, np.ndarray]],
    min_count: int,
    max_len: int | None,
    frequent: dict[frozenset[Any], int],
) -> None:
    if max_len is not None and len(prefix) >= max_len:
        return
    working = list(items)
    while working:
        item, tidset = working.pop()
        new_prefix = tuple([*prefix, item])
        support = int(tidset.shape[0])
        if support < min_count:
            continue
        frequent[frozenset(new_prefix)] = support
        if max_len is not None and len(new_prefix) >= max_len:
            continue
        suffix: list[tuple[Any, np.ndarray]] = []
        for other_item, other_tidset in working:
            intersection = _intersect_sorted(tidset, other_tidset)
            if intersection.shape[0] >= min_count:
                suffix.append((other_item, intersection))
        suffix.sort(key=lambda pair: (pair[1].shape[0], str(pair[0])))
        _eclat_extend(
            prefix=new_prefix,
            items=suffix,
            min_count=min_count,
            max_len=max_len,
            frequent=frequent,
        )


def _intersect_sorted(left: np.ndarray, right: np.ndarray) -> np.ndarray:
    return np.intersect1d(left, right, assume_unique=True)


def _apriori_gen(previous: Sequence[frozenset[Any]]) -> list[frozenset[Any]]:
    previous_set = set(previous)
    candidates: set[frozenset[Any]] = set()
    ordered = list(previous)
    for left, right in combinations(ordered, 2):
        union = left | right
        if len(union) != len(left) + 1:
            continue
        if all(frozenset(subset) in previous_set for subset in combinations(union, len(left))):
            candidates.add(union)
    return sorted(candidates, key=lambda itemset: tuple(sorted(map(str, itemset))))


def _intersect_item_tids(
    itemset: Iterable[Any], item_tids: Mapping[Any, np.ndarray]
) -> np.ndarray:
    ordered = sorted(itemset, key=lambda item: item_tids[item].shape[0])
    acc = item_tids[ordered[0]]
    for item in ordered[1:]:
        acc = _intersect_sorted(acc, item_tids[item])
        if acc.size == 0:
            break
    return acc


def _itemsets_frame(
    frequent: Mapping[frozenset[Any], int], n_transactions: int
) -> pd.DataFrame:
    if not frequent:
        return _empty_itemsets()
    rows = sorted(
        (
            {
                "support": count / n_transactions,
                "itemsets": frozenset(itemset),
            }
            for itemset, count in frequent.items()
        ),
        key=lambda row: (
            len(row["itemsets"]),
            -row["support"],
            sorted(map(str, row["itemsets"])),
        ),
    )
    return pd.DataFrame(rows)


def _empty_itemsets() -> pd.DataFrame:
    return pd.DataFrame(columns=["support", "itemsets"])
