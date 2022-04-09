resource "aws_cloudwatch_metric_alarm" "aws_app_ecs_high_cpu_util" {
  for_each            = toset(var.alarmType == "aws_app_ecs_high_cpu_util" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/ECS"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    ClusterName = data.terraform_remote_state.application_base["1"].outputs.cluster.name
    ServiceName = data.terraform_remote_state.application_base["1"].outputs.service.name
  }

  alarm_description = "Cluster's cpu utilization too high."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}

resource "aws_cloudwatch_metric_alarm" "aws_app_ecs_high_memory_util" {
  for_each            = toset(var.alarmType == "aws_app_ecs_high_memory_util" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "MemoryUtilization"
  namespace           = "AWS/ECS"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    ClusterName = data.terraform_remote_state.application_base["1"].outputs.cluster.name
    ServiceName = data.terraform_remote_state.application_base["1"].outputs.service.name
  }

  alarm_description = "Cluster's memory utilization too high."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}

