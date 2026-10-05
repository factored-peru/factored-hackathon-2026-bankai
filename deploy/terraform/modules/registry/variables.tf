variable "project_id" {
  type = string
}

variable "region" {
  type = string
}

variable "name_prefix" {
  type    = string
  default = "bankai"
}

variable "repository_id" {
  type        = string
  default     = "bankai"
  description = "Artifact Registry Docker repository id (path segment)."
}

variable "create_ci_service_account" {
  type        = bool
  default     = true
  description = "Create a dedicated SA for GitHub Actions (WIF binding is documented separately)."
}

variable "writer_members" {
  type        = set(string)
  default     = []
  description = "Extra IAM members with artifactregistry.writer (e.g. serviceAccount:…)."
}

variable "reader_members" {
  type        = set(string)
  default     = []
  description = "IAM members with artifactregistry.reader (Cloud Run runtime SAs)."
}
