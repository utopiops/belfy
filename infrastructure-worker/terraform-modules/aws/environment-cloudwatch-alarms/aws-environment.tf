####################################### Alb alarms
resource "aws_cloudwatch_metric_alarm" "aws_env_HTTPCode_ELB_5XX_Count" {
  for_each            = toset(var.alarmType == "aws_env_HTTPCode_ELB_5XX_Count" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "HTTPCode_ELB_5XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = var.period
  statistic           = "Sum"
  threshold           = var.threshold

  dimensions = {
    LoadBalancer = format("app/%s", data.terraform_remote_state.environment_base.outputs.albs[var.albDisplayName].name)
  }

  alarm_description = "Too many 5xx responses sent from Application Load Balancer."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}

resource "aws_cloudwatch_metric_alarm" "aws_env_HTTPCode_ELB_4XX_Count" {
  for_each            = toset(var.alarmType == "aws_env_HTTPCode_ELB_4XX_Count" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "HTTPCode_ELB_4XX_Count"
  namespace           = "AWS/ApplicationELB"
  period              = var.period
  statistic           = "Sum"
  threshold           = var.threshold

  dimensions = {
    LoadBalancer = format("app/%s", data.terraform_remote_state.environment_base.outputs.albs[var.albDisplayName].name)
  }

  alarm_description = "Too many 4xx responses sent from Application Load Balancer."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}



####################################### ECS alarms

resource "aws_cloudwatch_metric_alarm" "aws_env_ecs_high_cpu_util" {
  for_each            = toset(var.alarmType == "aws_env_ecs_high_cpu_util" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    ClusterName = data.terraform_remote_state.environment_base.outputs.ecs_cluster[var.ecsClusterName].name
  }

  alarm_description = "Cluster's cpu utilization too high."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}




resource "aws_cloudwatch_metric_alarm" "aws_env_ecs_high_memory_util" {
  for_each            = toset(var.alarmType == "aws_env_ecs_high_memory_util" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    ClusterName = data.terraform_remote_state.environment_base.outputs.ecs_cluster[var.ecsClusterName].name
  }

  alarm_description = "Cluster's memory utilization too high."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}

