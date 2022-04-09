variable "region" {
  type    = string
  default = "us-east-1"
}
variable "index_document" {
  type    = string
  default = "index.html"
}
variable "error_document" {
  type    = string
  default = "error.html"
}

variable "app_name" {
  type = string
}

variable "domain_state" {
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

variable "default_ttl" {
  type    = number
  default = 3600
}

variable "max_ttl" {
  type    = number
  default = 72000
}
