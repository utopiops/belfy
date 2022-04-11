# All the target groups used by the same ALB with the same settings
resource "aws_alb_target_group" "alb_target_group" {
  for_each = { for index, port in var.alb_exposed_ports.ports : tostring(port.host_port) => port }
  name     = format("%s-%s-%s", local.name_prefix, each.value.host_port, random_string.rand_8.result)
  port     = each.value.host_port
  protocol = "HTTP"
  vpc_id   = data.terraform_remote_state.environment_base.outputs.vpc_id

  lifecycle {
    create_before_destroy = true
  }

  health_check {                                         // Get these from the users
    healthy_threshold   = each.value.healthy_threshold   //5
    unhealthy_threshold = each.value.unhealthy_threshold //2
    interval            = each.value.interval            //30
    matcher             = each.value.matcher             //"200-299"
    path                = each.value.path                //"/"
    timeout             = each.value.timeout             //5
    protocol            = "HTTP"
    port                = "traffic-port"
  }
}

resource "aws_autoscaling_attachment" "asg_attachment_alb" {
  for_each               = { for index, instance_group_port in local.instance_group_alb_ports : "${instance_group_port.name}.${instance_group_port.host_port}" => instance_group_port }
  autoscaling_group_name = aws_autoscaling_group.instance_groups[each.value.name].name
  alb_target_group_arn   = aws_alb_target_group.alb_target_group[each.value.host_port].arn
}
