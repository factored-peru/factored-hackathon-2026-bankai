module "runtime" {
  source = "../../modules/runtime"

  project_id              = var.project_id
  region                  = var.region
  name_prefix             = var.name_prefix
  backend_image           = var.backend_image
  pipeline_image          = var.pipeline_image
  kg_artifact_bucket_name = var.kg_artifact_bucket_name
  backend_environment     = var.backend_environment
  pipeline_environment    = var.pipeline_environment
}
