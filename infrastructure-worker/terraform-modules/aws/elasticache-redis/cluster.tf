resource "random_string" "rand_8" {
  length  = 8
  upper   = false
  special = false
}

locals {
  cluster_name = format("%s-%s-%s", var.environment, var.display_name, random_string.rand_8.result)
}


resource "aws_elasticache_parameter_group" "main" {
  name   = local.cluster_name
  family = "redis${substr(var.engine_version, 0, 3)}"

  parameter {
    name  = "cluster-enabled"
    value = var.is_cluster_mode_disabled ? "no" : "yes"
  }
}

resource "aws_elasticache_replication_group" "main" {
  automatic_failover_enabled    = (var.number_cache_clusters > 1 || !var.is_cluster_mode_disabled) ? true : false
  multi_az_enabled              = (var.number_cache_clusters > 1 || !var.is_cluster_mode_disabled) ? true : false
  replication_group_description = "${local.cluster_name}, managed by UTOPIOPS-WATER."
  security_group_ids            = [aws_security_group.main.id]
  replication_group_id          = local.cluster_name
  node_type                     = var.node_type
  number_cache_clusters         = var.is_cluster_mode_disabled ? var.number_cache_clusters : null
  parameter_group_name          = aws_elasticache_parameter_group.main.name
  engine_version                = var.engine_version
  port                          = 6379

  dynamic "cluster_mode" {
    for_each = toset(var.is_cluster_mode_disabled ? [] : ["1"])
    content {
      replicas_per_node_group = var.replicas_per_node_group
      num_node_groups         = var.num_node_groups
    }
  }

  tags = {
    "managed_by"  = "UTOPIOPS-WATER"
    "environment" = var.environment
  }
}
