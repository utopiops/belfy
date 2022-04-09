output "fqdn" {
  value = local.fqdn
}

output "cluster_name" {
  value = var.ecs_cluster_name
}

output "cluster_resource_name" {
  value = data.terraform_remote_state.environment_base.outputs.ecs_cluster[var.ecs_cluster_name].name
}

output "ecs-servie" {
  value = format("%s__%s", var.app_name, var.environment)
}

output "cluster" {
  value = {
    display_name = var.ecs_cluster_name
    name         = data.terraform_remote_state.environment_base.outputs.ecs_cluster[var.ecs_cluster_name].name
  }
}

output "service" {
  value = {
    name    = aws_ecs_service.ecs_service.name
    cluster = aws_ecs_service.ecs_service.cluster
  }
}

output "urls" {
  value = length(var.exposed_ports) == 0 ? [lower(format("%s://%s", data.terraform_remote_state.environment_base.outputs.alb_listener["${var.alb_name}.${var.alb_listener_port}"].protocol, local.fqdn))] : [ for exposed_port in var.exposed_ports : lower(format("%s://%s", data.terraform_remote_state.environment_base.outputs.alb_listener["${exposed_port.alb_name}.${exposed_port.alb_listener_port}"].protocol, local.fqdns["${exposed_port.exposed_container_name}.${exposed_port.exposed_container_port}"]))]
}

output "log_groups" {
  value = { for index, k in var.containers : k.name => aws_cloudwatch_log_group.log_group[k.name].name }
}

