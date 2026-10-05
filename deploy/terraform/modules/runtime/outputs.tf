output "backend_service_account" {
  value = google_service_account.backend.email
}

output "pipeline_service_account" {
  value = google_service_account.pipeline.email
}

output "backend_uri" {
  value = google_cloud_run_v2_service.backend.uri
}

output "pipeline_job_name" {
  value = google_cloud_run_v2_job.pipeline.name
}

output "kg_artifact_bucket" {
  value = google_storage_bucket.kg_artifacts.name
}

output "evaluation_dataset" {
  value = google_bigquery_dataset.evaluation.dataset_id
}

output "evaluation_table" {
  value = google_bigquery_table.evaluation_results.table_id
}

output "effective_backend_environment_keys" {
  description = "Non-secret env keys merged into Cloud Run (values may include hosts)."
  value       = sort(keys(local.backend_env))
}
