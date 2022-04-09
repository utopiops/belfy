
resource "aws_cloudwatch_log_group" "dmesg" {
  for_each          = toset([for index, cluster in var.ecs_clusters : cluster.displayName]) //todo: use the cluser names (uuid...) instead of displaynames
  name              = format("/%s/%s/var/log/dmesg", var.environment, each.key)
  retention_in_days = var.cluster_logs_retention_in_days
}

resource "aws_cloudwatch_log_group" "docker" {
  for_each          = toset([for index, cluster in var.ecs_clusters : cluster.displayName])
  name              = format("/%s/%s/var/log/docker", var.environment, each.key)
  retention_in_days = var.cluster_logs_retention_in_days
}

resource "aws_cloudwatch_log_group" "ecs-agent" {
  for_each          = toset([for index, cluster in var.ecs_clusters : cluster.displayName])
  name              = format("/%s/%s/var/log/ecs/ecs-agent.log", var.environment, each.key)
  retention_in_days = var.cluster_logs_retention_in_days
}

resource "aws_cloudwatch_log_group" "ecs-init" {
  for_each          = toset([for index, cluster in var.ecs_clusters : cluster.displayName])
  name              = format("/%s/%s/var/log/ecs/ecs-init.log", var.environment, each.key)
  retention_in_days = var.cluster_logs_retention_in_days
}

resource "aws_cloudwatch_log_group" "audit" {
  for_each          = toset([for index, cluster in var.ecs_clusters : cluster.displayName])
  name              = format("/%s/%s/var/log/ecs/audit.log", var.environment, each.key)
  retention_in_days = var.cluster_logs_retention_in_days
}

resource "aws_cloudwatch_log_group" "messages" {
  for_each          = toset([for index, cluster in var.ecs_clusters : cluster.displayName])
  name              = format("/%s/%s/var/log/messages", var.environment, each.key)
  retention_in_days = var.cluster_logs_retention_in_days
}
