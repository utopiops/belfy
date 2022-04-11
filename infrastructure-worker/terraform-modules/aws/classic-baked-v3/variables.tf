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

variable "alb_exposed_ports" {
  type = object({
    alb_display_name = string,
    ports = list(object({
      load_balancer_port  = number
      host_port           = number
      dns_prefix          = string,
      healthy_threshold   = string,
      unhealthy_threshold = string,
      interval            = string,
      matcher             = string,
      path                = string,
      timeout             = string,
    })),
  })
}

variable "nlb_exposed_ports" {
  type = object({
    nlb_display_name = string,
    ports = list(object({
      port_number         = number
      protocol            = string // Valid values : TLS, TCP, UDP, TCP_UDP. Default: TCP
      certificate_arn     = string // Only assign a value if protocol is TLS o.w. set it to ""
      dns_prefix          = string,
      healthy_threshold   = string,
      unhealthy_threshold = string,
      interval            = string, //  Must be 10 or 30
    })),
  })
}

variable "instance_groups" {
  type = list(object({
    display_name = string,
    count        = number,
    min_size     = number,
    max_size     = number,
    instances = list(object({
      instance_type     = string,
      weighted_capacity = number
    })),
    root_volume_size = number,
    key_pair_name    = string,
    labels           = list(string),
    is_spot          = bool
  }))
}

variable "instance_iam_role" {
  default = ""
  type    = string
}

variable "image_id" {
  type = string
}

variable "base64encoded_user_data" {
  type    = string
  default = null
}