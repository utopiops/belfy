variable "environment" {
  type        = string
  description = "Environment name"
}
variable "location" {
  type = string
}

variable "address_space" {
  type    = string
  default = "10.0.0.0/16"
}

variable "enable_vnet_ddos_protection" {
  type    = bool
  default = false
}

variable "enabled_subresources" {
  type = list(string)
  description = "The name of the subresources for which the private endpoint should be enabled"
  default = []
}

variable "domain" {
  description = "Domain of the environment. dns field contains the complete fqdn of the environment, e.g. example.com or stg.example.com."
  type = object({
    dns    = string,
    create = bool
  })
}