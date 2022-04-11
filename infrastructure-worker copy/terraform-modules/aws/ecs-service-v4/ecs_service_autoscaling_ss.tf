# step scaling not supporetd yet. Code incomplete.... but should be able to make it work with minimum effort



# resource "random_string" "rand_16" {
#   length  = 16
#   special = false
# }


# resource "aws_appautoscaling_target" "app_scale_target" {
#   service_namespace  = "ecs"
#   resource_id        = "service/${aws_ecs_cluster.ecs_service.name}/${data.terraform_remote_state.environment_base.outputs.ecs_cluster[var.ecs_cluster_name].name}"
#   scalable_dimension = "ecs:service:DesiredCount"
#   max_capacity       = var.service_max_capacity
#   min_capacity       = var.service_min_capacity
# }


# resource "aws_cloudwatch_metric_alarm" "cpu_utilization_high" {
#   alarm_name          = format("%s-%s-high-value-detect", var.environment, var.app_name, )
#   comparison_operator = "GreaterThanOrEqualToThreshold"
#   evaluation_periods  = "1"
#   metric_name         = var.service_autoscaling.metric_name //"CPUUtilization"
#   namespace           = "AWS/ECS"
#   period              = "60"
#   statistic           = "Average"
#   threshold           = var.service_autoscaling.threshold

#   dimensions = {
#     ClusterName = aws_ecs_cluster.app.name
#     ServiceName = aws_ecs_service.app.name
#   }

#   alarm_actions = [aws_appautoscaling_policy.app_up.arn]
# }

# resource "aws_cloudwatch_metric_alarm" "cpu_utilization_low" {
#   alarm_name          = "${var.app}-${var.environment}-CPU-Utilization-Low-${var.ecs_as_cpu_low_threshold_per}"
#   comparison_operator = "LessThanThreshold"
#   evaluation_periods  = "1"
#   metric_name         = "CPUUtilization"
#   namespace           = "AWS/ECS"
#   period              = "60"
#   statistic           = "Average"
#   threshold           = var.ecs_as_cpu_low_threshold_per

#   dimensions = {
#     ClusterName = aws_ecs_cluster.app.name
#     ServiceName = aws_ecs_service.app.name
#   }

#   alarm_actions = [aws_appautoscaling_policy.app_down.arn]
# }

# resource "aws_appautoscaling_policy" "app_up" {
#   name               = "app-scale-up"
#   service_namespace  = aws_appautoscaling_target.app_scale_target.service_namespace
#   resource_id        = aws_appautoscaling_target.app_scale_target.resource_id
#   scalable_dimension = aws_appautoscaling_target.app_scale_target.scalable_dimension

#   step_scaling_policy_configuration {
#     adjustment_type         = "ChangeInCapacity"
#     cooldown                = 60
#     metric_aggregation_type = "Average"

#     step_adjustment {
#       metric_interval_lower_bound = 0
#       scaling_adjustment          = 1
#     }
#   }
# }

# resource "aws_appautoscaling_policy" "app_down" {
#   name               = "app-scale-down"
#   service_namespace  = aws_appautoscaling_target.app_scale_target.service_namespace
#   resource_id        = aws_appautoscaling_target.app_scale_target.resource_id
#   scalable_dimension = aws_appautoscaling_target.app_scale_target.scalable_dimension

#   step_scaling_policy_configuration {
#     adjustment_type         = "ChangeInCapacity"
#     cooldown                = 300
#     metric_aggregation_type = "Average"

#     step_adjustment {
#       metric_interval_upper_bound = 0
#       scaling_adjustment          = -1
#     }
#   }
# }