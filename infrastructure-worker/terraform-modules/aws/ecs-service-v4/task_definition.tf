resource "aws_ecs_task_definition" "services" {
  family = format("%s__%s", var.app_name, var.environment)
  container_definitions = jsonencode([
    for index, container in var.containers :
    {
      name              = container.name
      image             = length(container.image) > 0 ? container.image : format("%s:%s", aws_ecr_repository.ecr[container.name].repository_url, lookup(var.container_tags, container.name, "latest"))
      cpu               = container.cpu
      memory            = container.memory
      memoryReservation = container.memoryReservation
      essential         = container.is_essential
      portMappings = [
        for port in container.ports: {
          containerPort = port.containerPort
          hostPort      = port.hostPort
        }
      ]
      environment = [
        for env_var in container.environmentVariables :
        {
          name  = env_var.name
          value = env_var.value
        }
      ]
      logConfiguration = {
          logDriver = "awslogs",
          options = {
            awslogs-group: aws_cloudwatch_log_group.log_group[container.name].name
            awslogs-region: var.environment_state.region // We know that everything is created in the same region as the provider
          }
        }
    }
  ])
  task_role_arn      = var.task_role_arn
  execution_role_arn = aws_iam_role.task_execution_role.arn
  network_mode       = var.network_mode
  memory             = var.memory
  cpu                = var.cpu
}

resource "aws_cloudwatch_log_group" "log_group" {
  for_each          = { for index, k in var.containers : k.name => k }
  retention_in_days = each.value.retentionInDays
}

