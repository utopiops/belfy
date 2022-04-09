variable "region" {
  type        = string
  description = "Provider region"
}

variable "environment" {
  type        = string
  description = "Environment name"
}
variable "display_name" {
  type        = string
  description = "Redis display name"
}
variable "environment_state" {
  type = object({
    bucket = string,
    key    = string,
    region = string,
  })
}

variable "engine_version" {
  type        = string
  description = "Reidis cluster version"
  default     = "6.x"
}

variable "node_type" {
  type        = string
  description = "The node type for the read/write node in the redis cluster when cluster mode is disabled. e.g. cache.t3.micro"
}

variable "is_cluster_mode_disabled" {
  type        = bool
  description = "Determines whether this is a single node redis cluster or not."
  default     = true
}
variable "number_cache_clusters" {
  type        = number
  description = "The number of cache clusters (primary and replicas) this replication group will have."
  default     = 0 # must be greater than 0 if is_cluster_mode_disabled is true
}

variable "replicas_per_node_group" {
  type        = number
  description = "Number of replica nodes in each node group. Valid values are 0 to 5. Changing this number will trigger an online resizing operation before other settings modifications."
  default     = 0 # must be greater than 0 if is_cluster_mode_disabled is false
}

variable "num_node_groups" {
  type        = number
  description = "Number of node groups (shards) for this Redis replication group. Changing this number will trigger an online resizing operation before other settings modifications."
  default     = 0 # must be greater than 0 if is_cluster_mode_disabled is false
}

###### Limitations:
# Global repplication not supported
# Custom parameters (for parameter group) not supported
# Doesn't support authorization
