import unittest

from bankai_pipeline.classification import CategoricalNaiveBayes, apply_platt, binary_metrics, fit_platt


class ClassificationTest(unittest.TestCase):
    def test_naive_bayes_uses_population_prior_and_known_evidence(self):
        model = CategoricalNaiveBayes().fit(
            [{"channel": "APP"}, {"channel": "APP"}, {"channel": "BRANCH"}, {"channel": "BRANCH"}],
            [True, True, False, False], population_counts={True: 10, False: 90},
        )
        self.assertGreater(model.probabilities({"channel": "APP"})[True], model.probabilities({"channel": "BRANCH"})[True])

    def test_platt_and_weighted_metrics_return_safe_aggregate_values(self):
        coefficient, intercept = fit_platt([0.1, 0.2, 0.8, 0.9], [False, False, True, True], [3, 3, 1, 1])
        metrics = binary_metrics([apply_platt(value, coefficient, intercept) for value in [0.1, 0.2, 0.8, 0.9]], [False, False, True, True], [3, 3, 1, 1])
        self.assertIn("pr_auc", metrics)
        self.assertEqual(metrics["decision_threshold"], "not_approved")
