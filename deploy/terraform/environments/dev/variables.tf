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

variable "backend_environment" {
  type    = map(string)
  default = {}
}

variable "pipeline_environment" {
  type    = map(string)
  default = {}
}
