"""Approved aggregate KG case definitions for Dispute Transaction Support.

These definitions describe analytical populations, not customers or individual
disputes.  They deliberately keep C6--C8 visible as blocked rather than
inventing relationships that are absent from the canonical source.
"""

from __future__ import annotations

from dataclasses import dataclass


CASE_CATALOG_VERSION = "bankai-dispute-kg-cases-v1"


@dataclass(frozen=True)
class KgCaseDefinition:
    identifier: str
    population: str | None
    target: str | None
    predictors: tuple[str, ...]
    status: str
    limitation: str


def case_definitions() -> tuple[KgCaseDefinition, ...]:
    """Return the closed, PII-safe case catalog in a stable order."""

    return (
        KgCaseDefinition(
            "C1",
            "complaints",
            "sla_breached",
            (
                "case_type", "category", "subcategory", "reception_channel",
                "priority", "claimed_amount_bucket", "currency",
                "is_repeat_complainer", "creation_month", "creation_weekday",
            ),
            "exploratory_not_promoted",
            "No approved threshold or operational prioritization.",
        ),
        KgCaseDefinition(
            "C2",
            "complaints",
            "resolution_days",
            ("priority", "reception_channel"),
            "exploratory_not_promoted",
            "The global baseline outperformed the cohort baseline.",
        ),
        KgCaseDefinition(
            "C3",
            "transactions",
            "is_fraud",
            (
                "transaction_type", "transaction_category", "amount_bucket",
                "currency", "channel", "merchant_category", "transaction_status",
                "response_code", "transaction_month", "transaction_weekday",
            ),
            "exploratory_not_promoted",
            "The existing fraud score outperformed the experimental baseline.",
        ),
        KgCaseDefinition(
            "C4",
            "call_center_interactions",
            "requires_followup|was_escalated",
            ("interaction_type", "channel", "interaction_date_parts"),
            "exploratory_not_promoted",
            "No approved automation; text and transcripts are excluded.",
        ),
        KgCaseDefinition(
            "C5",
            "call_center_interactions",
            "main_score",
            ("interaction_type", "channel", "interaction_date_parts"),
            "exploratory_not_promoted",
            "No evidence supports automatic service recovery.",
        ),
        KgCaseDefinition(
            "C6", None, None, (), "blocked",
            "Missing canonical complaint-to-transaction relation.",
        ),
        KgCaseDefinition(
            "C7", None, None, (), "blocked",
            "Missing merchant evidence and validated dispute outcome.",
        ),
        KgCaseDefinition(
            "C8", None, None, (), "blocked",
            "Missing payment-rail reconciliation evidence.",
        ),
    )
