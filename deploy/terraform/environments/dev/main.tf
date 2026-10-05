module "registry" {
  source = "../../modules/registry"

  project_id  = var.project_id
  region      = var.region
  name_prefix = var.name_prefix
}

module "state" {
  source = "../../modules/state"

  project_id         = var.project_id
  region             = var.region
  name_prefix        = var.name_prefix
  upload_bucket_name = var.upload_bucket_name
}

module "runtime" {
  source = "../../modules/runtime"

  project_id              = var.project_id
  region                  = var.region
  name_prefix             = var.name_prefix
  backend_image           = var.backend_image
  pipeline_image          = var.pipeline_image
  kg_artifact_bucket_name = var.kg_artifact_bucket_name
  backend_environment        = var.backend_environment
  backend_secret_environment = var.backend_secret_environment
  pipeline_environment       = var.pipeline_environment
  upload_bucket_name         = module.state.upload_bucket_name
  kv_url                     = module.state.kv_url
  vpc_connector_id           = module.state.vpc_connector_id
}

resource "google_storage_bucket_iam_member" "backend_upload_writer" {
  bucket = module.state.upload_bucket_name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${module.runtime.backend_service_account}"
}

# Cloud Run runtimes pull images by digest from Artifact Registry.
resource "google_artifact_registry_repository_iam_member" "backend_reader" {
  project    = var.project_id
  location   = module.registry.location
  repository = module.registry.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${module.runtime.backend_service_account}"
}

resource "google_artifact_registry_repository_iam_member" "pipeline_reader" {
  project    = var.project_id
  location   = module.registry.location
  repository = module.registry.repository_id
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${module.runtime.pipeline_service_account}"
}

# GitHub Actions (WIF → this SA) may update Cloud Run service/job images only.
resource "google_project_iam_member" "github_ci_run_developer" {
  count = module.registry.github_ci_service_account != null ? 1 : 0

  project = var.project_id
  role    = "roles/run.developer"
  member  = "serviceAccount:${module.registry.github_ci_service_account}"
}

resource "google_service_account_iam_member" "github_ci_act_as_backend" {
  count = module.registry.github_ci_service_account != null ? 1 : 0

  service_account_id = "projects/${var.project_id}/serviceAccounts/${module.runtime.backend_service_account}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${module.registry.github_ci_service_account}"
}

resource "google_service_account_iam_member" "github_ci_act_as_pipeline" {
  count = module.registry.github_ci_service_account != null ? 1 : 0

  service_account_id = "projects/${var.project_id}/serviceAccounts/${module.runtime.pipeline_service_account}"
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${module.registry.github_ci_service_account}"
}
