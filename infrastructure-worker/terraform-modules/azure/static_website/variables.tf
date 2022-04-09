variable "environment" {
  type        = string
  description = "Environment name"
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

variable "environment_state" {
  type = object({
    resource_group_name  = string,
    storage_account_name = string,
    container_name       = string,
    key                  = string,
  })
}

variable "cdn_sku_profile" { // We don't support yet
  type        = string
  description = "The pricing related information of current CDN profile. Accepted values are Standard_Akamai, Standard_ChinaCdn, Standard_Microsoft, Standard_Verizon or Premium_Verizon."
  default     = "Standard_Microsoft" // The only supported value is Standard_Microsoft
}

variable "release_version" {
  type        = string
  description = "Release version to be used to fill the content of the S3 bucket with based on the release bucket's content"
  default     = ""
}