import unittest

from bankai_pipeline.dispute_contracts import COMPLAINTS, profile_quality, validate_schema


class DisputeContractsTest(unittest.TestCase):
    def test_rejects_missing_or_drifted_required_schema(self) -> None:
        report = validate_schema(
            "transactions",
            {
                "transaction_id": "STRING",
                "customer_id": "STRING",
                "transaction_timestamp": "TIMESTAMP",
                "transaction_status": "INTEGER",
                "amount": "NUMERIC",
                "currency": "STRING",
            },
        )
        self.assertFalse(report.valid)
        self.assertEqual(report.unexpected_types, ("transaction_status",))

    def test_quality_profile_only_returns_aggregate_metadata(self) -> None:
        profile = profile_quality(
            [
                {"complaint_id": "synthetic-a", "customer_id": "synthetic-user", "created_at": "2026-01-01", "status": "open"},
                {"complaint_id": "synthetic-a", "customer_id": "synthetic-user", "created_at": "2026-01-02", "status": None},
            ],
            COMPLAINTS,
        )
        self.assertEqual(profile["row_count"], 2)
        self.assertEqual(profile["duplicate_primary_key_count"], 1)
        self.assertNotIn("synthetic-user", str(profile))


if __name__ == "__main__":
    unittest.main()
