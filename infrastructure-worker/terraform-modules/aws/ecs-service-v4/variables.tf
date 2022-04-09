variable "region" {
  type        = string
  description = "Provider region"
}

variable "environment" {
  type        = string
  description = "Environment name"
}
variable "app_name" {
  type        = string
  description = "Application name"
}
variable "environment_state" {
  type = object({
    bucket = string,
    key    = string,
    region = string,
  })
}

############################### Task definition and service ############################
variable "ecs_cluster_name" {
  type = string
}
variable "containers" {
  type = list(object({
    name         = string,
    image        = string,
    is_essential = bool,
    ports = list(object({
      containerPort = number,
      hostPort      = number,
    }))
    environmentVariables = list(object({
      name  = string,
      value = string
    })),
    cpu               = number,
    memory            = number,
    memoryReservation = number,
    retentionInDays   = number
  }))
}
variable "network_mode" {
  type    = string
  default = null
}
variable "memory" {
  default = null
}
variable "cpu" {
  default = null
}
variable "exposed_container_name" {
  type    = string
  default = ""
}
variable "exposed_container_port" {
  type    = number
  default = 0
}

variable "certificate_arn" {
  type        = string
  default     = ""
  description = "ARN of the certificate to be set for ALB listener"
}
variable "should_set_dns" { // This is ignored atm, we set the dns if we can!
  type    = bool
  default = false
}

variable "task_role_arn" {
  type    = string
  default = null
}

variable "service_desired_count" {
  type        = number
  description = "Number of instances of the task definition to place and keep running. Defaults to 0. Do not specify if using the DAEMON scheduling strategy."
}

variable "deployment_minimum_healthy_percent" {
  type        = number
  default     = 50
  description = "Lower limit (as a percentage of the service's desiredCount) of the number of running tasks that must remain running and healthy in a service during a deployment."
}

########################### Target Group Config ################################
variable "health_check_path" {
  type    = string
  default = "/"
}
variable "healthy_threshold" {
  type        = number
  default     = 3
  description = "Target group healthy threshold"
}
variable "unhealthy_threshold" {
  type        = number
  default     = 3
  description = "Target group unhealthy threshold"
}
variable "interval" {
  type        = number
  default     = 30
  description = "Target group health check interval"
}
variable "matcher" {
  type        = string
  default     = "200-299"
  description = "Target group matcher"
}
variable "timeout" {
  type        = number
  default     = 5
  description = "Target group timeout"
}

variable "alb_name" {
  type        = string
  description = "The name of the ALB to expose the application"
  default     = ""
}
variable "alb_listener_port" {
  type        = number
  description = "The port on the ALB to expose the application"
  default     = 0
}

variable "container_tags" {
  type        = map(string)
  description = "The values that specify which tag to be used for the containers, normally should be passed for a deployment"
  default     = {}
}

variable "cookie_duration" { // Not supported at the moment
  description = "If load balancer connection stickiness is desired, set this to the duration that cookie should be valid. If no stickiness is wanted, leave it blank. e.g.: 300"
  type        = number
  default     = 0
}

variable "health_check_grace_period_seconds" { // Not supported at the moment
  type        = number
  description = "The period of time, in seconds, unhealthy health checks are ignored after a task is first run"
  default     = 0
}


############################################## service autoscaling 
variable "service_autoscaling" {
  type = object({
    min_capacity    = number
    max_capacity    = number
    metric_to_track = string # cpu or memrory
    target_value    = number
  })
  default = null
}

variable "exposed_ports" {
  type = list(object({
    domain_suffix                      = string # "The suffix to be added to the application name to build the domain name. Only one of the objcts in the list can set this to empty string"
    exposed_container_name             = string
    exposed_container_port             = string
    protocol_version                   = string # The protocol version. Specify GRPC to send requests to targets using gRPC. Specify HTTP2 to send requests to targets using HTTP/2. The default is HTTP1, which sends requests to targets using HTTP/1.1
    alb_name                           = string # "The name of the ALB to expose the application"
    alb_listener_port                  = number # "The port on the ALB to expose the application"
    certificate_arn                    = string # default: EMPTY_STRING "ARN of the certificate to be set for ALB listener"
    health_check_path                  = string # default: /health
    healthy_threshold                  = number # default: 3 "Target group healthy threshold"
    unhealthy_threshold                = number # default: 3 "Target group unhealthy threshold"
    interval                           = number # default: 30 "Target group health check interval"
    timeout                            = number # default: 5 "Target group timeout"
    matcher                            = string # default: 200-299
    cookie_duration                    = number # default: 0 "If load balancer connection stickiness is desired, set this to the duration that cookie should be valid. If no stickiness is wanted, leave it blank. e.g.: 300"
    health_check_grace_period_seconds  = number # default: 20 "The period of time, in seconds, unhealthy health checks are ignored after a task is first run" 
    deployment_minimum_healthy_percent = number # default: 50 "Lower limit (as a percentage of the service's desiredCount) of the number of running tasks that must remain running and healthy in a service during a deployment."
  }))
  default = []
}
