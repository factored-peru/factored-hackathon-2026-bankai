import importlib.util
import pathlib
import unittest


SCRIPT_PATH = (
    pathlib.Path(__file__).resolve().parents[1] / "scripts" / "list_bigquery_tables.py"
)
SPEC = importlib.util.spec_from_file_location("list_bigquery_tables", SCRIPT_PATH)
assert SPEC is not None and SPEC.loader is not None
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)


class Dataset:
    def __init__(self, dataset_id: str) -> None:
        self.dataset_id = dataset_id


class Table:
    def __init__(self, table_id: str, table_type: str) -> None:
        self.table_id = table_id
        self.table_type = table_type


class FakeClient:
    def list_datasets(self, *, project: str):
        self.project = project
        return [Dataset("zeta"), Dataset("alpha")]

    def list_tables(self, dataset: Dataset):
        return {
            "zeta": [Table("events", "TABLE")],
            "alpha": [Table("cases", "VIEW"), Table("transactions", "TABLE")],
        }[dataset.dataset_id]


class ListBigQueryTablesTest(unittest.TestCase):
    def test_lists_only_sorted_table_metadata(self) -> None:
        client = FakeClient()

        result = MODULE.list_table_metadata(client, "factored-hackathon", [])

        self.assertEqual(client.project, "factored-hackathon")
        self.assertEqual(
            result,
            [
                {"dataset_id": "alpha", "table_id": "cases", "table_type": "VIEW"},
                {
                    "dataset_id": "alpha",
                    "table_id": "transactions",
                    "table_type": "TABLE",
                },
                {"dataset_id": "zeta", "table_id": "events", "table_type": "TABLE"},
            ],
        )

    def test_filters_requested_datasets(self) -> None:
        result = MODULE.list_table_metadata(FakeClient(), "factored-hackathon", ["zeta"])

        self.assertEqual(
            result,
            [{"dataset_id": "zeta", "table_id": "events", "table_type": "TABLE"}],
        )
