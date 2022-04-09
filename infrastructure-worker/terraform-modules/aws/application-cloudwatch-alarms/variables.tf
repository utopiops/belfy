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

variable "application_state_key" {
  type = string
}

variable "alarmType" {
  type        = string
  description = "Alarm type"
  # Allowed values:
    # aws_app_classic_baked_high_cpu_util
    # aws_app_classic_baked_high_memory_util
    # aws_app_ecs_high_cpu_util
    # aws_app_ecs_high_memory_util
    # aws_app_s3_website_high_5xxErrorRate
    # aws_app_s3_website_high_4xxErrorRate
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
}

variable "endpoint" {
  type        = string
  description = "sns endpopint"
}





#########################################################
###### classic baked specific
variable "instanceGroupDisplayName" {
  type        = string
  description = "(Required for classic baked) Instance group name."
  default     = ""
}
