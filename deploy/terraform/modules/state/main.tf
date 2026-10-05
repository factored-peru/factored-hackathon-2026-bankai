data "google_compute_network" "selected" {
  name    = var.network_name
  project = var.project_id
}

resource "google_firestore_database" "app" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  # Hackathon/dev: allow recreate if the environment is torn down deliberately.
  delete_protection_state = "DELETE_PROTECTION_DISABLED"
}

resource "google_firestore_index" "conversation_snapshots_list" {
  project    = var.project_id
  database   = google_firestore_database.app.name
  collection = "conversation_snapshots"

  fields {
    field_path = "tenantId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "ownerUserId"
    order      = "ASCENDING"
  }

  fields {
    field_path = "trace.updatedAt"
    order      = "DESCENDING"
  }
}

resource "google_storage_bucket" "uploads" {
  name                        = var.upload_bucket_name
  location                    = var.region
  uniform_bucket_level_access = true
  public_access_prevention    = "enforced"
  force_destroy               = false

  versioning {
    enabled = true
  }
}

resource "google_redis_instance" "sessions" {
  name               = "${var.name_prefix}-sessions"
  tier               = "BASIC"
  memory_size_gb     = var.memorystore_memory_size_gb
  region             = var.region
  redis_version      = "REDIS_7_0"
  display_name       = "${var.name_prefix} session Valkey/Redis"
  authorized_network = data.google_compute_network.selected.id
  # TLS + auth can be layered later with Secret Manager; BASIC open-in-VPC for first cut.
  transit_encryption_mode = "DISABLED"
  auth_enabled            = false
}

resource "google_vpc_access_connector" "runtime" {
  name          = "${var.name_prefix}-vpc"
  project       = var.project_id
  region        = var.region
  network       = data.google_compute_network.selected.name
  ip_cidr_range = var.vpc_connector_cidr
  min_instances = 2
  max_instances = 3
}
