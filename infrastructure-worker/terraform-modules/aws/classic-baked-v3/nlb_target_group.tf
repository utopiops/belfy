# All the target groups used by the same ALB with the same settings
resource "aws_alb_target_group" "nlb_target_group" {
  for_each = { for index, port in var.nlb_exposed_ports.ports : tostring(port.port_number) => port }
  name     = format("%s-%s-%s", local.name_prefix, each.value.port_number, random_string.rand_8.result)
  port     = each.value.port_number
  protocol = each.value.protocol
  vpc_id   = data.terraform_remote_state.environment_base.outputs.vpc_id

  lifecycle {
    create_before_destroy = true
  }

  health_check {
    healthy_threshold   = each.value.healthy_threshold
    unhealthy_threshold = each.value.unhealthy_threshold
    interval            = each.value.interval
    protocol            = "TCP"
    port                = "traffic-port"
  }

  tags = {
    CreatedBy   = "UTOPIOPS_WATER"
    Environment = var.environment
    Application = var.app_name
    Name        = format("%s-%s-%s-classic-baked", var.environment, var.app_name, each.key)
  }
}

resource "aws_autoscaling_attachment" "asg_attachment_nlb" {
  for_each               = { for index, instance_group_port in local.instance_group_nlb_ports : "${instance_group_port.name}.${instance_group_port.port_number}" => instance_group_port }
  autoscaling_group_name = aws_autoscaling_group.instance_groups[each.value.name].name
  alb_target_group_arn   = aws_alb_target_group.nlb_target_group[each.value.port_number].arn
}

