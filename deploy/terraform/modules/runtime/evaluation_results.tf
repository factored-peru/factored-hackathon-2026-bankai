# Sanitized evaluation results (ADR 0015). A dataset of its own, apart from the
# customer-data dataset the backend reads, so the two never share IAM.
resource "google_bigquery_dataset" "evaluation" {
  dataset_id                 = var.evaluation_dataset_id
  location                   = var.region
  description                = "Sanitized, versioned evaluation results. Metadata only."
  delete_contents_on_destroy = false
}

resource "google_bigquery_table" "evaluation_results" {
  dataset_id          = google_bigquery_dataset.evaluation.dataset_id
  table_id            = var.evaluation_table_id
  description         = "One row per fixture, metric and evaluator. schema_version v1."
  schema              = file("${path.module}/evaluation_results_schema.json")
  deletion_protection = true

  time_partitioning {
    type  = "DAY"
    field = "recorded_at"
  }

  clustering = ["route", "metric"]
}

# Streaming inserts need only bigquery.tables.updateData. The predefined
# roles that carry it (dataEditor and above) also allow deleting and updating
# rows, so a custom role keeps the backend to inserts.
resource "google_project_iam_custom_role" "evaluation_writer" {
  role_id     = "${replace(var.name_prefix, "-", "_")}_evaluation_writer"
  title       = "Bankai evaluation result writer"
  description = "Insert-only access to the evaluation results table."
  permissions = ["bigquery.tables.updateData"]
}

resource "google_bigquery_table_iam_member" "backend_evaluation_writer" {
  project    = var.project_id
  dataset_id = google_bigquery_table.evaluation_results.dataset_id
  table_id   = google_bigquery_table.evaluation_results.table_id
  role       = google_project_iam_custom_role.evaluation_writer.id
  member     = "serviceAccount:${google_service_account.backend.email}"
}
