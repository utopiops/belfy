variable "region" {
  type        = string
  description = "Provider region"
}
variable "index_document" {
  type    = string
  default = "index.html"
}
variable "error_document" {
  type    = string
  default = "error.html"
}

variable "acm_certificate_arn" {
  type        = string
  description = "The certificate to use in the main distribution"
  default     = ""
}

variable "redirect_acm_certificate_arn" {
  type        = string
  description = "The certificate to use in the redirect distribution"
  default     = null
}

variable "app_name" {
  type = string
}

variable "release_version" {
  type        = string
  description = "Release version to be used to fill the content of the S3 bucket with based on the release bucket's content"
  default     = ""
}

variable "environment_state" {
  type = object({
    bucket = string,
    key    = string,
    region = string,
  })
}

variable "redirect_to_www" {
  type    = bool
  default = false
}