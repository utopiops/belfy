resource "aws_cloudwatch_metric_alarm" "aws_app_s3_website_high_5xxErrorRate" {
  for_each            = toset(var.alarmType == "aws_app_s3_website_high_5xxErrorRate" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/CloudFront"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    DistributionId = data.terraform_remote_state.application_base["1"].outputs.distribution_id
    Region = "Global"
  }

  alarm_description = "Too many 5xx responses."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}

resource "aws_cloudwatch_metric_alarm" "aws_app_s3_website_high_4xxErrorRate" {
  for_each            = toset(var.alarmType == "aws_app_s3_website_high_4xxErrorRate" ? ["1"] : [])
  alarm_name          = var.alarmName
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = var.evaluationPeriods
  metric_name         = "CPUUtilization"
  namespace           = "AWS/CloudFront"
  period              = var.period
  statistic           = "Average"
  threshold           = var.threshold

  dimensions = {
    DistributionId = data.terraform_remote_state.application_base["1"].outputs.distribution_id
    Region = "Global"
  }

  alarm_description = "Too many 4xx responses."
  alarm_actions     = [aws_sns_topic.alarm_notification.arn]
  ok_actions        = [aws_sns_topic.alarm_notification.arn]
}

