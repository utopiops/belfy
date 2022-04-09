variable "project_id" {
  type = string
}

variable "environment" {
  type        = string
  description = "Environment name"
}

variable "region" {
  type = string
}

variable "address_space" {
  type    = string
  default = "10.0.0.0/8"
}


variable "dns" {
  type = object({
    is_own : bool
    is_cross_account : bool
    parent_domain : string
  })
}




variable "routing_mode" {
  type        = string
  default     = "GLOBAL"
  description = "The network routing mode (default 'GLOBAL')"
}
