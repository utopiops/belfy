resource "aws_ecs_service" "ecs_service" {
  name                               = format("%s__%s", var.app_name, var.environment)
  iam_role                           = length(var.exposed_ports) == 0 ? aws_iam_role.ecs_service_role.name : null
  cluster                            = data.terraform_remote_state.environment_base.outputs.ecs_cluster[var.ecs_cluster_name].arn
  task_definition                    = aws_ecs_task_definition.services.arn
  desired_count                      = var.service_desired_count
  deployment_minimum_healthy_percent = var.deployment_minimum_healthy_percent
  health_check_grace_period_seconds  = var.health_check_grace_period_seconds

  dynamic "load_balancer" {
    for_each = toset(length(var.exposed_ports) == 0 ? ["single_port"] : [])
    content {
      target_group_arn = aws_alb_target_group.single_port[load_balancer.key].arn
      container_port   = var.exposed_container_port
      container_name   = var.exposed_container_name
    }
  }

  dynamic "load_balancer" {
    for_each = { for exposed_port in var.exposed_ports : "${exposed_port.exposed_container_name}.${exposed_port.exposed_container_port}" => exposed_port }
    content {
      target_group_arn = aws_alb_target_group.multi_port[load_balancer.key].arn
      container_port   = load_balancer.value.exposed_container_port
      container_name   = load_balancer.value.exposed_container_name
    }
  }

  ordered_placement_strategy {
    field = "instanceId"
    type  = "spread"
  }

  ordered_placement_strategy {
    field = "attribute:ecs.availability-zone"
    type  = "spread"
  }

  dynamic "capacity_provider_strategy" { // If we don't do this, we have to add `capacity_provider_strategy` to ignore_changes which is gonna cause problem in the future that we let users to chose capacity strategies
    for_each = toset([for cp in data.terraform_remote_state.environment_base.outputs.ecs_cluster_default_capacity_providers[var.ecs_cluster_name] : cp])
    iterator = strategy
    content {
      base              = strategy.value.base
      capacity_provider = strategy.value.capacity_provider
      weight            = strategy.value.weight
    }
  }

  lifecycle {
    ignore_changes = [desired_count]
  }

  depends_on = [aws_iam_role.ecs_service_role] // This is to avoid race condition #see https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
}
