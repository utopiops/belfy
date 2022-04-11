resource "random_string" "tt_names" {
  length  = 16
  special = false
}

resource "aws_appautoscaling_target" "app_tt_scale_target" {
  for_each           = toset(var.service_autoscaling != null ? ["1"] : [])
  service_namespace  = "ecs"
  resource_id        = "service/${data.terraform_remote_state.environment_base.outputs.ecs_cluster[var.ecs_cluster_name].name}/${aws_ecs_service.ecs_service.name}"
  scalable_dimension = "ecs:service:DesiredCount"
  max_capacity       = var.service_autoscaling.max_capacity
  min_capacity       = var.service_autoscaling.min_capacity
}

resource "aws_appautoscaling_policy" "service_target_tracking_policy" {
  for_each           = toset(var.service_autoscaling != null ? ["1"] : [])
  name               = format("%s-%s-memory-tracking-%s", var.environment, var.app_name, random_string.tt_names.result)
  policy_type        = "TargetTrackingScaling"
  resource_id        = aws_appautoscaling_target.app_tt_scale_target["1"].resource_id
  scalable_dimension = aws_appautoscaling_target.app_tt_scale_target["1"].scalable_dimension
  service_namespace  = aws_appautoscaling_target.app_tt_scale_target["1"].service_namespace

  target_tracking_scaling_policy_configuration {
    predefined_metric_specification {
      predefined_metric_type = var.service_autoscaling.metric_to_track == "memory" ? "ECSServiceAverageMemoryUtilization" : "ECSServiceAverageCPUUtilization"
    }

    target_value = var.service_autoscaling.target_value
    scale_in_cooldown  = 300
    scale_out_cooldown = 300
  }

}
