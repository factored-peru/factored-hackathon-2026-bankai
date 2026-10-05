variable "project_id" {
  type = string
}

variable "region" {
  type    = string
  default = "us-central1"
}

variable "name_prefix" {
  type    = string
  default = "bankai"
}

variable "backend_image" {
  type = string
}

variable "pipeline_image" {
  type = string
}

variable "kg_artifact_bucket_name" {
  type = string
}

variable "upload_bucket_name" {
  type        = string
  description = "Globally unique private bucket for conversation attachment uploads."
}

variable "backend_environment" {
  type    = map(string)
  default = {}
}

variable "backend_secret_environment" {
  type        = map(string)
  default     = {}
  description = "Env var name → Secret Manager secret id for Cloud Run secret refs."
}

variable "pipeline_environment" {
  type    = map(string)
  default = {}
}
