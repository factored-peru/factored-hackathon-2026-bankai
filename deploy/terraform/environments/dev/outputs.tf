output "backend_uri" {
  value = module.runtime.backend_uri
}

output "backend_service_account" {
  value = module.runtime.backend_service_account
}

output "pipeline_job_name" {
  value = module.runtime.pipeline_job_name
}

output "kg_artifact_bucket" {
  value = module.runtime.kg_artifact_bucket
}

output "upload_bucket_name" {
  value = module.state.upload_bucket_name
}

output "kv_url" {
  value     = module.state.kv_url
  sensitive = true
}

output "firestore_database" {
  value = module.state.firestore_database
}

output "vpc_connector_id" {
  value = module.state.vpc_connector_id
}

output "effective_backend_environment_keys" {
  value = module.runtime.effective_backend_environment_keys
}

output "artifact_registry_url" {
  value = module.registry.repository_url
}

output "backend_image_prefix" {
  value = module.registry.backend_image_prefix
}

output "pipeline_image_prefix" {
  value = module.registry.pipeline_image_prefix
}

output "github_ci_service_account" {
  value = module.registry.github_ci_service_account
}

output "backend_service_name" {
  value = "${var.name_prefix}-backend"
}
