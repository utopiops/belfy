variable "region" {
  type        = string
  description = "Provider region"
}

variable "environment" {
  type = string
}
variable "eks_cluster_name" {
  type = string
}
variable "eks_version" {
  type        = string
  description = "Version of the EKS cluster"
}
variable "eks_enabled_cluster_log_types" {
  type        = list(string)
  description = "EKS cluster log types"
  default     = ["api", "audit", "authenticator", "controllerManager", "scheduler"]
}
variable "eks_endpoint_private_access" {
  type        = bool
  description = "Enable EKS API server private access"
  default     = true
}
variable "eks_public_access" {
  type        = bool
  description = "Enable EKS API server public access"
  default     = true
}
variable "eks_logs_retention_in_days" {
  type    = number
  default = 7
}
variable "tags" {
  type = map(string)
}

variable "environment_state" {
  type = object({
    bucket = string,
    key    = string,
    region = string,
  })
}


variable "worker_launch_template" {
  type = object({
    root_volume_size = string
    image_id         = string
  })
  default = null
}

variable "instance_groups" {
  type = list(object({
    name           = string
    capacity_type  = string
    instance_types = list(string)
    disk_size      = number
    desired_size   = number
    max_size       = number
    min_size       = number
    tags           = map(string)
  }))
  description = "List of worker node groups to be added to the cluster"
}

variable "fargate_profiles" {
  type = list(object({
    name      = string
    namespace = string
    labels    = map(string)
  }))
  default = []
}

variable "eks_worker_assume_role_arns" {
  type        = list(string)
  description = "List of roles that EKS workers should be able to assume"
}

variable "enable_insights" {
  type    = bool
  default = false
}

variable "retention_in_days" {
  type    = number
  default = 3
}
