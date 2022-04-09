variable "region" {
  type        = string
  description = "Provider region"
}

variable "environment_state" {
  type = object({
    bucket = string,
    key    = string,
    region = string,
  })
}

variable "alarmType" {
  type        = string
  description = "Alarm type"
  # Allwed values:
  #   aws_env_HTTPCode_ELB_5XX_Count
  #   aws_env_HTTPCode_ELB_4XX_Count
  #   aws_env_ecs_high_cpu_util
  #   aws_env_ecs_high_memory_util
}
variable "alarmName" {
  type        = string
  description = "Alarm name, must uniquely identify the alarm."
}
variable "evaluationPeriods" {
  type        = string
  description = "The number of periods over which data is compared to the specified threshold."
  default     = "2"
}
variable "period" {
  type        = string
  description = "(optional) The period in seconds over which the specified statistic is applied."
  default     = "60"
}
variable "threshold" {
  type        = string
  description = "The value against which the specified statistic is compared. This parameter is REQUIRED for alarms based on static thresholds, but should not be used for alarms based on anomaly detection models."
  default     = ""
}

variable "endpoint" {
  type        = string
  description = "sns endpopint"
}





#########################################################
###### ALB specific
variable "albDisplayName" {
  type        = string
  description = "(Required for alb alarms) ALB display name"
  default     = ""
}

variable "ecsClusterName" {
  type        = string
  description = "(Required for ecs alarms) ECS cluster display name"
  default     = ""
}
