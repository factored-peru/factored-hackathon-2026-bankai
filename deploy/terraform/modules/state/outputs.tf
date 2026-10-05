output "firestore_database" {
  value = google_firestore_database.app.name
}

output "upload_bucket_name" {
  value = google_storage_bucket.uploads.name
}

output "kv_host" {
  value = google_redis_instance.sessions.host
}

output "kv_port" {
  value = google_redis_instance.sessions.port
}

output "kv_url" {
  description = "Non-TLS redis URL for VPC-private Memorystore (Cloud Run via connector)."
  value       = "redis://${google_redis_instance.sessions.host}:${google_redis_instance.sessions.port}"
}

output "vpc_connector_id" {
  value = google_vpc_access_connector.runtime.id
}

output "memorystore_instance_name" {
  value = google_redis_instance.sessions.name
}
