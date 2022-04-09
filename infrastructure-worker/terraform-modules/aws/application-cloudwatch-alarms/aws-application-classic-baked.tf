resource "aws_cloudwatch_metric_alarm" "aws_app_classic_baked_high_cpu_util" {
  for_each            = toset(var.alarmType == "aws_app_classic_baked_high_cpu_util" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    AutoScalingGroupName = data.terraform_remote_state.application_base["1"].outputs.asg[var.instanceGroupDisplayName].name
  }

  alarm_description = "Instance group's cpu utilization too high."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}

resource "aws_cloudwatch_metric_alarm" "aws_app_classic_baked_high_memory_util" {
  for_each            = toset(var.alarmType == "aws_app_classic_baked_high_memory_util" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    AutoScalingGroupName = data.terraform_remote_state.application_base["1"].outputs.asg[var.instanceGroupDisplayName].name
  }

  alarm_description = "Instance group's memory utilization too high."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}
