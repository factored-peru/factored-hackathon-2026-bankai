resource "google_project_service" "artifactregistry" {
  project            = var.project_id
  service            = "artifactregistry.googleapis.com"
  disable_on_destroy = false
}

resource "google_artifact_registry_repository" "containers" {
  project       = var.project_id
  location      = var.region
  repository_id = var.repository_id
  description   = "Bankai service container images (consume by digest only)"
  format        = "DOCKER"

  depends_on = [google_project_service.artifactregistry]
}

resource "google_service_account" "github_ci" {
  count = var.create_ci_service_account ? 1 : 0

  project      = var.project_id
  account_id   = "${var.name_prefix}-github-ci"
  display_name = "Bankai GitHub Actions CI (WIF)"
}

locals {
  ci_member = var.create_ci_service_account ? (
    ["serviceAccount:${google_service_account.github_ci[0].email}"]
  ) : []

  writer_members = toset(concat(tolist(var.writer_members), local.ci_member))
}

resource "google_artifact_registry_repository_iam_member" "writers" {
  for_each = local.writer_members

  project    = var.project_id
  location   = google_artifact_registry_repository.containers.location
  repository = google_artifact_registry_repository.containers.name
  role       = "roles/artifactregistry.writer"
  member     = each.value
}

resource "google_artifact_registry_repository_iam_member" "readers" {
  for_each = var.reader_members

  project    = var.project_id
  location   = google_artifact_registry_repository.containers.location
  repository = google_artifact_registry_repository.containers.name
  role       = "roles/artifactregistry.reader"
  member     = each.value
}
