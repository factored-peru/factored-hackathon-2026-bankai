import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest

from bankai_pipeline.suite import build


class SuiteTest(unittest.TestCase):
    def test_requires_all_cases_and_records_blocked_cases(self):
        names = {"C1": "c1-manifest.json", "C2": "c2-manifest.json", "C3": "c3-manifest.json", "C4": "c4-manifest.json", "C5": "c5-manifest.json"}
        with TemporaryDirectory() as temporary:
            root = Path(temporary); directories = {}
            for case, name in names.items():
                folder = root / case; folder.mkdir(); directories[case] = folder
                (folder / name).write_text(json.dumps({"case": case, "publication": "not_requested", "schema_version": "test", "run_id": "fixture"}))
            report = build(directories, root / "out", "suite-fixture")
            self.assertEqual(sorted(report["cases"]), ["C1", "C2", "C3", "C4", "C5"])
            self.assertIn("C6", report["blocked_cases"])
