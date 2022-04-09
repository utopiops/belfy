resource "aws_autoscaling_group" "instance_groups" {
  for_each            = { for index, instance_group in var.instance_groups : instance_group.display_name => instance_group }
  name                = format("%s-%s-%s", local.name_prefix, each.key, random_string.rand_8.result)
  max_size            = each.value.max_size
  min_size            = each.value.min_size
  desired_capacity    = each.value.count
  vpc_zone_identifier = data.terraform_remote_state.environment_base.outputs.private_subnets

  mixed_instances_policy {
    launch_template {
      launch_template_specification {
        version            = "$Latest"
        launch_template_id = aws_launch_template.launch_template[each.key].id
      }

      dynamic "override" {
        for_each = { for index, instance in each.value.instances : instance.instance_type => instance }
        content {
          instance_type     = override.key
          weighted_capacity = override.value.weighted_capacity
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
      value               = format("%s-%s", var.environment, each.key)
      propagate_at_launch = true
    },
    {
      key                 = "CreatedBy"
      value               = "UTOPIOPS-WATER"
      propagate_at_launch = true
    }
  ]

  lifecycle { // We ignore them here and use standalone `aws_autoscaling_attachment`
    ignore_changes = [load_balancers, target_group_arns]
  }

}

resource "aws_launch_template" "launch_template" {

  for_each    = { for index, instance_group in var.instance_groups : instance_group.display_name => instance_group }
  name_prefix = format("%s-%s", local.name_prefix, each.key)
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
    arn = length(var.instance_iam_role) > 0 ? aws_iam_instance_profile.instance_profile["0"].arn : null
  }

  image_id                             = var.image_id
  instance_initiated_shutdown_behavior = "terminate"
  instance_type                        = ""
  key_name                             = each.value.key_pair_name

  monitoring {
    enabled = true
  }

  lifecycle {
    create_before_destroy = true
  }

  vpc_security_group_ids = [aws_security_group.security_group.id]

  user_data = var.base64encoded_user_data
}

resource "aws_iam_instance_profile" "instance_profile" {
  for_each = toset(length(var.instance_iam_role) > 0 ? ["0"] : [])
  role     = var.instance_iam_role
}


resource "aws_security_group" "security_group" {
  description = format("%s-%s instance security group", var.environment, var.app_name)
  vpc_id      = data.terraform_remote_state.environment_base.outputs.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    CreatedBy   = "UTOPIOPS_WATER"
    Environment = var.environment
    Name        = format("%s-%s", var.environment, var.app_name)
  }
}
resource "aws_security_group_rule" "instance_sg_rule" { #receieve traffic from all the VPC on the ports exposed through ALB
  for_each          = { for index, port in var.alb_exposed_ports.ports : tostring(port.host_port) => port }
  type              = "ingress"
  from_port         = each.value.host_port
  to_port           = each.value.host_port
  protocol          = "tcp"
  cidr_blocks       = [data.terraform_remote_state.environment_base.outputs.vpc_cidr]
  security_group_id = aws_security_group.security_group.id
}

resource "aws_security_group_rule" "instance_sg_rule_nlb" { #receieve traffic from all the VPC on the ports exposed through NLB
  for_each          = { for index, port in var.nlb_exposed_ports.ports : tostring(port.port_number) => port }
  type              = "ingress"
  from_port         = each.value.port_number
  to_port           = each.value.port_number
  protocol          = "tcp"
  cidr_blocks       = [data.terraform_remote_state.environment_base.outputs.vpc_cidr]
  security_group_id = aws_security_group.security_group.id
}

resource "aws_security_group_rule" "sg_rule_alb" { # Allow traffic from the ALB on the specified ports (single ALB for all the ports exposed through ALB)
  for_each                 = { for index, port in var.alb_exposed_ports.ports : tostring(port.host_port) => port }
  type                     = "ingress"
  from_port                = each.value.host_port
  to_port                  = each.value.host_port
  protocol                 = "tcp"
  source_security_group_id = data.terraform_remote_state.environment_base.outputs.alb_security_groups[var.alb_exposed_ports.alb_display_name].id
  security_group_id        = aws_security_group.security_group.id
}

locals {
  instance_group_alb_ports = flatten([
    for i, instance_group in var.instance_groups : [
      for j, port in var.alb_exposed_ports.ports : {
        name      = instance_group.display_name
        host_port = tostring(port.host_port)
      }
    ]
  ])
}

locals {
  instance_group_nlb_ports = flatten([
    for i, instance_group in var.instance_groups : [
      for j, port in var.nlb_exposed_ports.ports : {
        name        = instance_group.display_name
        port_number = tostring(port.port_number)
      }
    ]
  ])
}

