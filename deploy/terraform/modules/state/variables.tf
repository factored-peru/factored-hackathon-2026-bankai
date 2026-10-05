variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type = string
}

variable "upload_bucket_name" {
  type        = string
  description = "Globally unique private GCS bucket for conversation attachment bytes."
}

variable "network_name" {
  type        = string
  default     = "default"
  description = "VPC used by Memorystore and the Serverless VPC Access connector."
}

variable "vpc_connector_cidr" {
  type        = string
  default     = "10.8.0.0/28"
  description = "Unused /28 for the VPC Access connector."
}

variable "memorystore_memory_size_gb" {
  type    = number
  default = 1
}
