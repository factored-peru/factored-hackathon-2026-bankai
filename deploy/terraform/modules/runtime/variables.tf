variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "backend_image" {
  type        = string
  description = "Immutable backend image reference supplied by CI."
}

variable "pipeline_image" {
  type        = string
  description = "Immutable pipeline image reference supplied by CI."
}

variable "kg_artifact_bucket_name" {
  type = string
}

variable "backend_environment" {
  type        = map(string)
  default     = {}
  description = "Non-secret runtime configuration only. Secrets use Secret Manager references later."
}

variable "pipeline_environment" {
  type        = map(string)
  default     = {}
  description = "Non-secret job configuration only."
}
