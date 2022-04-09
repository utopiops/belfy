resource "aws_sns_topic" "alarm_notification" {
}

resource "aws_sns_topic_subscription" "alarm_notification_subscription" {
  topic_arn              = "${aws_sns_topic.alarm_notification.arn}"
  protocol               = "https"
  endpoint               = var.endpoint
  endpoint_auto_confirms = true
}
