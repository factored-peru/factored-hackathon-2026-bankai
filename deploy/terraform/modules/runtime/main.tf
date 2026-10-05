resource "google_service_account" "backend" {
  account_id   = "${var.name_prefix}-backend"
  display_name = "Bankai backend runtime"
}

resource "google_service_account" "pipeline" {
  account_id   = "${var.name_prefix}-pipeline"
  display_name = "Bankai offline pipeline runtime"
}

resource "google_storage_bucket" "kg_artifacts" {
  name                        = var.kg_artifact_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"

  versioning {
    enabled = true
  }
}

resource "google_storage_bucket_iam_member" "pipeline_artifact_writer" {
  bucket = google_storage_bucket.kg_artifacts.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_storage_bucket_iam_member" "backend_artifact_reader" {
  bucket = google_storage_bucket.kg_artifacts.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "pipeline_bigquery_job_user" {
  project = var.project_id
  role    = "roles/bigquery.jobUser"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

resource "google_project_iam_member" "backend_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.backend.email}"
}

resource "google_project_iam_member" "pipeline_firestore_user" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.pipeline.email}"
}

locals {
  productive_flags = var.inject_productive_flags ? merge(
    var.upload_bucket_name != "" ? {
      FIRESTORE_ENABLED = "true"
      GCS_ENABLED       = "true"
      GCS_UPLOAD_BUCKET = var.upload_bucket_name
      GCS_UPLOAD_PREFIX = "conversation-uploads/"
    } : {},
    var.kv_url != "" ? {
      SESSION_STORE_ENABLED = "true"
      KV_PROVIDER           = "valkey"
      KV_URL                = var.kv_url
      KV_TLS                = "false"
    } : {},
  ) : {}

  backend_env = merge(
    var.backend_environment,
    local.productive_flags,
    {
      GCS_GRAPH_BUCKET = google_storage_bucket.kg_artifacts.name
    },
  )
}

resource "google_cloud_run_v2_service" "backend" {
  name     = "${var.name_prefix}-backend"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.backend.email

    dynamic "vpc_access" {
      for_each = var.vpc_connector_id != "" ? [var.vpc_connector_id] : []
      content {
        connector = vpc_access.value
        egress    = "PRIVATE_RANGES_ONLY"
      }
    }

    containers {
      image = var.backend_image

      ports {
        container_port = 3000
      }

      dynamic "env" {
        for_each = local.backend_env
        content {
          name  = env.key
          value = env.value
        }
      }
    }
  }

  traffic {
    percent = 100
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
  }

  # CI updates digests via gcloud; Terraform owns env, VPC, IAM, and scaling.
  lifecycle {
    ignore_changes = [
      template[0].containers[0].image,
    ]
  }
}

resource "google_cloud_run_v2_job" "pipeline" {
  name     = "${var.name_prefix}-pipeline"
  location = var.region

  template {
    template {
      service_account = google_service_account.pipeline.email
      max_retries     = 1
      timeout         = "1800s"

      containers {
        image = var.pipeline_image
        args  = ["--stage", "all"]

        dynamic "env" {
          for_each = merge(var.pipeline_environment, {
            GCS_GRAPH_BUCKET = google_storage_bucket.kg_artifacts.name
          })
          content {
            name  = env.key
            value = env.value
          }
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image,
    ]
  }
}
