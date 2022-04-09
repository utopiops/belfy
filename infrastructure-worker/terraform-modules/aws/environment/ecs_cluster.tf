resource "random_uuid" "ecs_cluster_name" {
  for_each = { for index, cluster in var.ecs_clusters : cluster.displayName => cluster }
}

resource "aws_ecs_cluster" "ecs_cluster" {
  for_each = { for index, cluster in var.ecs_clusters : cluster.displayName => cluster }
  name     = random_uuid.ecs_cluster_name[each.key].result
  capacity_providers = concat(["FARGATE", "FARGATE_SPOT"],
    [
      for k, v in local.ecs_instance_groups : aws_ecs_capacity_provider.per_instance_group_cp["${v.ecs_cluster_display_name}.${v.instance_group_name}"].name if v.ecs_cluster_display_name == each.value.displayName
    ]
  )


  dynamic "default_capacity_provider_strategy" {
    for_each = { for k, v in local.ecs_instance_groups : k => v if v.ecs_cluster_display_name == each.value.displayName }
    iterator = strategy

    content {
      capacity_provider = aws_ecs_capacity_provider.per_instance_group_cp["${strategy.value.ecs_cluster_display_name}.${strategy.value.instance_group_name}"].name
      weight            = 1
    }
  }


  setting {
    name  = "containerInsights"
    value = var.environment == "production" ? "enabled" : "disabled" // This is not ideal but at least helps save money on non-production environments
  }

  tags = {
    CreatedBy   = "UTOPIOPS_WATER"
    Environment = var.environment
    Name        = format("%s-%s", var.environment, each.key)
  }

  configuration {
    execute_command_configuration {
      # kms_key_id = aws_kms_key.ecs_cluster_kms_key.arn
      logging = "OVERRIDE"

      log_configuration {
        cloud_watch_encryption_enabled = true
        cloud_watch_log_group_name     = aws_cloudwatch_log_group.ecs_cluster_log_group[each.key].name
      }
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_cloudwatch_log_group" "ecs_cluster_log_group" {
  for_each = { for index, cluster in var.ecs_clusters : cluster.displayName => cluster }
}

# resource "aws_kms_key" "ecs_cluster_kms_key" {
#   deletion_window_in_days = 7
# }


##################################### Instance groups #################################
locals {
  ecs_instance_groups = flatten([
    for i, ecs_cluster in var.ecs_clusters : [
      for j, instance_group in ecs_cluster.instanceGroups : {
        ecs_cluster_name         = random_uuid.ecs_cluster_name[ecs_cluster.displayName].result // Don't get this from the aws_ecs_cluster resource to avoid creating a cycle
        ecs_cluster_display_name = ecs_cluster.displayName
        instance_group_name      = instance_group.displayName
        desired_count            = instance_group.count
        min_size                 = instance_group.minSize
        max_size                 = instance_group.maxSize
        instances                = instance_group.instances
        root_volume_size         = instance_group.rootVolumeSize
        key_pair_name            = instance_group.keyPairName
        labels                   = instance_group.labels
        is_spot                  = instance_group.isSpot
      }
    ]
  ])
}

resource "aws_autoscaling_group" "instance_groups" {
  for_each            = { for index, ecs_instance_group in local.ecs_instance_groups : "${ecs_instance_group.ecs_cluster_display_name}.${ecs_instance_group.instance_group_name}" => ecs_instance_group }
  capacity_rebalance  = true
  max_size            = each.value.max_size
  min_size            = each.value.min_size
  desired_capacity    = each.value.desired_count
  vpc_zone_identifier = module.vpc.private_subnets
  # protect_from_scale_in = true

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        version            = "$Latest"
        launch_template_id = aws_launch_template.launch_template[each.key].id
      }

      dynamic "override" {
        for_each = toset([for index, instance in each.value.instances : instance])
        content {
          instance_type     = override.value.instanceType
          weighted_capacity = override.value.weightedCapacity
        }
      }
    }

    instances_distribution {
      on_demand_base_capacity                  = 0
      on_demand_percentage_above_base_capacity = each.value.is_spot ? 0 : 100 // at the moment it's 0 or one
      spot_allocation_strategy                 = "lowest-price"
    }
  }

  health_check_type = "ELB"
  tags = [
    {
      key                 = "Name"
      value               = format("%s-ecs-cluster-ig-%s", var.environment, each.key)
      propagate_at_launch = true
    },
    {
      key                 = "CreatedBy"
      value               = "UTOPIOPS-WATER"
      propagate_at_launch = true
    },
    {
      key                 = "AmazonECSManaged"
      value               = ""
      propagate_at_launch = true
    }
  ]

  // this is needed and at the same time it causes problem with destroy
  lifecycle {
    ignore_changes = ["desired_capacity", "max_size", "min_size"]
  }
}

resource "aws_launch_template" "launch_template" {

  for_each = { for index, ecs_instance_group in local.ecs_instance_groups : "${ecs_instance_group.ecs_cluster_display_name}.${ecs_instance_group.instance_group_name}" => ecs_instance_group }


  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size = each.value.root_volume_size
    }
  }

  # TODO: use this
  #  dynamic "block_device_mappings" {
  #   for_each = var.block_device_mappings
  #   content {
  #     device_name  = lookup(block_device_mappings.value, "device_name", null)
  #     no_device    = lookup(block_device_mappings.value, "no_device", null)
  #     virtual_name = lookup(block_device_mappings.value, "virtual_name", null)

  #     dynamic "ebs" {
  #       for_each = lookup(block_device_mappings.value, "ebs", [])
  #       content {
  #         delete_on_termination = lookup(ebs.value, "delete_on_termination", null)
  #         encrypted             = lookup(ebs.value, "encrypted", null)
  #         iops                  = lookup(ebs.value, "iops", null)
  #         kms_key_id            = lookup(ebs.value, "kms_key_id", null)
  #         snapshot_id           = lookup(ebs.value, "snapshot_id", null)
  #         volume_size           = lookup(ebs.value, "volume_size", null)
  #         volume_type           = lookup(ebs.value, "volume_type", null)
  #       }
  #     }
  #   }
  # }

  ebs_optimized = true


  iam_instance_profile {
    name = aws_iam_instance_profile.instance_profile.id
  }

  image_id                             = data.aws_ami.ecs_ami.image_id
  instance_initiated_shutdown_behavior = "terminate"
  instance_type                        = "" #var.instance_type
  key_name                             = each.value.key_pair_name

  monitoring {
    enabled = true
  }

  lifecycle {
    create_before_destroy = true
  }

  vpc_security_group_ids = [aws_security_group.security_group[each.value.ecs_cluster_display_name].id]

  user_data = base64encode(templatefile("${path.module}/ecs_user_data.sh", {
    cluster_name      = each.value.ecs_cluster_name
    ecs_config        = var.ecs_config
    ecs_logging       = var.ecs_logging
    env_name          = var.environment
    custom_userdata   = var.custom_userdata
    cloudwatch_prefix = format("/%s/%s", var.environment, each.value.ecs_cluster_name)
  }))
}

resource "random_uuid" "capacity_provider_name" {
  for_each = { for index, ecs_instance_group in local.ecs_instance_groups : "${ecs_instance_group.ecs_cluster_display_name}.${ecs_instance_group.instance_group_name}" => ecs_instance_group }
}

resource "aws_ecs_capacity_provider" "per_instance_group_cp" {
  for_each = { for index, ecs_instance_group in local.ecs_instance_groups : "${ecs_instance_group.ecs_cluster_display_name}.${ecs_instance_group.instance_group_name}" => ecs_instance_group }
  name     = random_uuid.capacity_provider_name[each.key].result

  auto_scaling_group_provider {
    auto_scaling_group_arn = aws_autoscaling_group.instance_groups[each.key].arn
    # managed_termination_protection = "ENABLED"

    managed_scaling {
      maximum_scaling_step_size = 50
      minimum_scaling_step_size = 1
      status                    = "ENABLED"
      target_capacity           = 100
    }
  }
}

####################################### Instance group IAM ###########################
// We use same role for all of launch templates
resource "aws_iam_role" "instance_role" {
  path               = "/"
  assume_role_policy = data.aws_iam_policy_document.ecs_instance_policy.json
}

data "aws_iam_policy_document" "ecs_instance_policy" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

resource "aws_iam_instance_profile" "instance_profile" {
  path = "/"
  role = aws_iam_role.instance_role.id
}

resource "aws_iam_role_policy_attachment" "instance_AmazonSSMManagedInstanceCore_attachment" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
  role       = aws_iam_role.instance_role.name
}

resource "aws_iam_role_policy_attachment" "ecs_instance_cloudwatch_role" {
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess" // TODO: limit the access to the cloudwatch log groups we create specifically for ECS agent
  role       = aws_iam_role.instance_role.name
}

resource "aws_iam_role_policy" "ecs_instance_role_policy" {
  policy = file("${path.module}/ecs_policy.tpl")
  role   = aws_iam_role.instance_role.name
}

resource "aws_iam_role_policy" "ecs_instance_role_autoscaling_policy" {
  policy = file("${path.module}/ecs_autoscaling.tpl")
  role   = aws_iam_role.instance_role.name
}




data "aws_ami" "ecs_ami" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-ecs-hvm-2.0.*-x86_64-ebs"]
  }
}


############################### Instance group security groups #########################
resource "aws_security_group" "security_group" {
  #for_each    = { for index, ecs_instance_group in local.ecs_instance_groups : "${ecs_instance_group.ecs_cluster_display_name}.${ecs_instance_group.instance_group_name}" => ecs_instance_group }
  for_each               = toset([for index, cluster in var.ecs_clusters : cluster.displayName])
  description            = format("%s-%s instance security group", var.environment, each.key)
  vpc_id                 = module.vpc.vpc_id
  revoke_rules_on_delete = true

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    CreatedBy   = "UTOPIOPS_WATER"
    Environment = var.environment
    Name        = format("env-%s-cluster-%s", var.environment, each.key)
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_security_group_rule" "instance_sg_rule_nlb" { #receieve traffic on all the ports from all the ALBs in the environment
  for_each                 = { for index, alb_ecs_cluster in local.alb_ecs_clusters : "${alb_ecs_cluster.ecs_cluster_display_name}.${alb_ecs_cluster.alb_display_name}" => alb_ecs_cluster }
  type                     = "ingress"
  from_port                = 0 // could set it to 32768 but then cannot use custom host port when creating ecs service, is it even necessary to support custom host port?
  to_port                  = 65535
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.elb_sg[each.value.alb_display_name].id
  security_group_id        = aws_security_group.security_group[each.value.ecs_cluster_display_name].id
}

locals {
  alb_ecs_clusters = flatten([
    for i, ecs_cluster in var.ecs_clusters : [
      for j, alb in var.albs : {
        ecs_cluster_display_name = ecs_cluster.displayName
        alb_display_name         = alb.displayName
      }
    ]
  ])

  ecs_cluster_default_capacity_providers = {
    for i, ecs_cluster in var.ecs_clusters : ecs_cluster.displayName =>
    [for j, cs in aws_ecs_cluster.ecs_cluster[ecs_cluster.displayName].default_capacity_provider_strategy : cs]
  }
}

