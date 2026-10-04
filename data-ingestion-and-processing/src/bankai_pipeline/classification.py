"""Small deterministic classifiers and metrics for offline KDD experiments."""

from __future__ import annotations

import math
from collections import Counter, defaultdict
from collections.abc import Iterable, Mapping


class CategoricalNaiveBayes:
    """Laplace-smoothed categorical Naive Bayes with optional population priors."""

    def __init__(self, alpha: float = 1.0) -> None:
        self.alpha = alpha
        self.classes: tuple[object, ...] = ()
        self.counts: dict[object, Counter[str]] = defaultdict(Counter)
        self.totals: Counter[object] = Counter()
        self.domains: dict[str, set[str]] = defaultdict(set)
        self.priors: dict[object, float] = {}

    def fit(
        self,
        records: Iterable[Mapping[str, str]],
        labels: Iterable[object],
        *,
        population_counts: Mapping[object, int] | None = None,
    ) -> "CategoricalNaiveBayes":
        records, labels = list(records), list(labels)
        if not records or len(records) != len(labels):
            raise ValueError("records and labels must be non-empty and aligned")
        self.counts.clear(); self.totals.clear(); self.domains.clear()
        for record, label in zip(records, labels, strict=True):
            self.totals[label] += 1
            for feature, value in record.items():
                self.domains[feature].add(value)
                self.counts[label][f"{feature}:{value}"] += 1
        self.classes = tuple(sorted(self.totals, key=str))
        source = population_counts or self.totals
        total = sum(source.get(label, 0) for label in self.classes)
        if total <= 0:
            raise ValueError("population counts must include fitted classes")
        self.priors = {
            label: (source.get(label, 0) + self.alpha) / (total + self.alpha * len(self.classes))
            for label in self.classes
        }
        return self

    def probabilities(self, record: Mapping[str, str]) -> dict[object, float]:
        if not self.classes:
            raise ValueError("model has not been fitted")
        scores: dict[object, float] = {}
        for label in self.classes:
            score = math.log(self.priors[label])
            for feature, value in record.items():
                if value not in self.domains.get(feature, set()):
                    continue
                score += math.log((self.counts[label][f"{feature}:{value}"] + self.alpha) / (self.totals[label] + self.alpha * len(self.domains[feature])))
            scores[label] = score
        peak = max(scores.values())
        weights = {label: math.exp(value - peak) for label, value in scores.items()}
        total = sum(weights.values())
        return {label: value / total for label, value in weights.items()}

    def payload(self) -> dict[str, object]:
        return {
            "algorithm": "categorical_naive_bayes_laplace",
            "alpha": self.alpha,
            "classes": [str(value) for value in self.classes],
            "class_counts": {str(key): value for key, value in self.totals.items()},
            "priors": {str(key): value for key, value in self.priors.items()},
            "domains": {key: sorted(value) for key, value in sorted(self.domains.items())},
            "conditional_counts": {str(key): dict(sorted(value.items())) for key, value in self.counts.items()},
        }


def fit_platt(probabilities: list[float], labels: list[bool], weights: list[float] | None = None) -> tuple[float, float]:
    from sklearn.linear_model import LogisticRegression

    if set(labels) != {False, True}:
        raise ValueError("Platt calibration requires both classes")
    fitted = LogisticRegression(random_state=0, solver="lbfgs", C=1_000_000).fit(
        [[_logit(value)] for value in probabilities], labels, sample_weight=weights
    )
    return float(fitted.coef_[0][0]), float(fitted.intercept_[0])


def apply_platt(probability: float, coefficient: float, intercept: float) -> float:
    return 1 / (1 + math.exp(-(coefficient * _logit(probability) + intercept)))


def binary_metrics(probabilities: list[float], labels: list[bool], weights: list[float] | None = None) -> dict[str, object]:
    from sklearn.metrics import average_precision_score, brier_score_loss, recall_score

    predictions = [value >= 0.5 for value in probabilities]
    return {
        "row_count": len(labels),
        "weighted_prevalence": round(sum(weight * label for weight, label in zip(weights or [1.0] * len(labels), labels, strict=True)) / sum(weights or [1.0] * len(labels)), 6),
        "pr_auc": round(float(average_precision_score(labels, probabilities, sample_weight=weights)), 6),
        "brier_score": round(float(brier_score_loss(labels, probabilities, sample_weight=weights)), 6),
        "recall_at_0_5_informational": round(float(recall_score(labels, predictions, sample_weight=weights)), 6),
        "decision_threshold": "not_approved",
    }


def categorical_item(value: object) -> str:
    import re
    import pandas as pd
    if pd.isna(value): return "UNKNOWN"
    if isinstance(value, bool): return "TRUE" if value else "FALSE"
    return re.sub(r"[^A-Z0-9_.-]", "_", str(value).strip().upper())[:64] or "UNKNOWN"


def _logit(value: float) -> float:
    value = min(max(value, 1e-6), 1 - 1e-6)
    return math.log(value / (1 - value))
