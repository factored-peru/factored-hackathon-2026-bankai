output "repository_id" {
  value = google_artifact_registry_repository.containers.repository_id
}

output "repository_name" {
  value = google_artifact_registry_repository.containers.name
}

output "location" {
  value = google_artifact_registry_repository.containers.location
}

output "repository_url" {
  description = "Base URL for docker push/pull (without image name)."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_id}"
}

output "backend_image_prefix" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_id}/backend"
}

output "pipeline_image_prefix" {
  value = "${var.region}-docker.pkg.dev/${var.project_id}/${var.repository_id}/pipeline"
}

output "github_ci_service_account" {
  value = var.create_ci_service_account ? google_service_account.github_ci[0].email : null
}
