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

variable "evaluation_dataset_id" {
  type        = string
  default     = "bankai_evaluation"
  description = "Dataset for sanitized evaluation results; must differ from the customer-data dataset."
}

variable "evaluation_table_id" {
  type        = string
  default     = "evaluation_results"
  description = "Table of sanitized evaluation results (schema_version v1)."
}

variable "upload_bucket_name" {
  type        = string
  default     = ""
  description = "When set, injected as GCS_UPLOAD_BUCKET and productive Firestore/GCS flags."
}

variable "kv_url" {
  type        = string
  default     = ""
  description = "When set, injected as KV_URL with SESSION_STORE_ENABLED=true."
}

variable "vpc_connector_id" {
  type        = string
  default     = ""
  description = "Optional Serverless VPC Access connector for Memorystore reachability."
}

variable "inject_productive_flags" {
  type        = bool
  default     = true
  description = "Merge staging productive flags when upload bucket / kv_url are supplied."
}
