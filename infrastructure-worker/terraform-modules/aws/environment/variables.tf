variable "region" {
  type        = string
  description = "Provider region"
}

variable "environment" {
  type        = string
  description = "Environment name"
}


variable "domain" {
  description = "Domain of the environment. dns field contains the complete fqdn of the environment, e.g. example.com or stg.example.com. Set creat to true to avoid creating hosted zone."
  type = object({
    dns    = string,
    create = bool
  })
}
#domain.dns should be set to false ONLY IF user has already created a hosted zone with name equal to dns in the targe AWS account

########################### VPC Config ################################

variable "vpc_name" {
  type        = string
  default     = ""
  description = "VPC name"
}

variable "availability_zones_count" {
  type        = number
  description = "How many AZs to be used in VPC"
  default     = 3
}

variable "azs" {
  type        = list(string)
  description = "List of availability zones"
  default     = []
}
variable "public_subnets" {
  type        = list(string)
  description = "List of public subnets CIDRs"
  default     = []
}

variable "private_subnets" {
  type        = list(string)
  description = "List of private subnets CIDRs"
  default     = []
}
variable "vpc_network_cidr" {
  type        = string
  default     = "10.1.0.0/16"
  description = "IP addressing for Test Network"
}

variable "enable_nat_gateway" {
  type    = bool
  default = true
}
variable "enable_dns_support" {
  type    = bool
  default = true
}
variable "enable_dns_hostnames" {
  type    = bool
  default = true
}
variable "single_nat_gateway" {
  type    = bool
  default = true
}

############################# ALB #############################
variable "albs" {
  type = list(object({
    displayName = string,
    listenerRules = list(object({
      port           = number,
      protocol       = string,
      certificateArn = string
    }))
    enable_waf  = bool
    is_internal = bool
  }))
}
variable "nlbs" {
  type = list(object({
    displayName = string,
    is_internal = bool
  }))
}


####################################### ECS cluster ##################################

variable "ecs_clusters" {
  type = list(object({
    displayName = string,
    instanceGroups = list(object({
      displayName = string,
      count       = number,
      minSize     = number,
      maxSize     = number,
      instances = list(object({
        instanceType     = string,
        weightedCapacity = number
      })),
      rootVolumeSize = number,
      keyPairName    = string,
      labels         = list(string),
      isSpot         = bool
    }))
  }))
}

variable "ecs_logging" { // Not supported atm, default value is used
  type        = string
  default     = "[\"json-file\",\"awslogs\"]"
  description = "Adding logging option to ECS that the Docker containers can use. It is possible to add fluentd as well"
}

variable "ecs_config" { // Not supported atm, default value is used
  type        = string
  default     = "echo '' > /etc/ecs/ecs.config"
  description = "Specify ecs configuration or get it from S3. Example: aws s3 cp s3://some-bucket/ecs.config /etc/ecs/ecs.config"
}

variable "custom_userdata" { // Not supported atm, default value is used
  type        = string
  default     = ""
  description = "Inject extra command in the instance template to be run on boot"
}

variable "cluster_logs_retention_in_days" { // Not supported atm, default value is used
  type    = number
  default = 3
}

####################################### WAF ##################################

variable "alb_waf" {
  type = object({
    rate_limit    = number
    managed_rules = list(string)
  })
  default = null
}
