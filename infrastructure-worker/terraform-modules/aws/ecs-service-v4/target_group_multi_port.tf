resource "aws_alb_target_group" "multi_port" {
  for_each         = { for exposed_port in var.exposed_ports : "${exposed_port.exposed_container_name}.${exposed_port.exposed_container_port}" => exposed_port }
  port             = each.value.protocol_version == "GRPC" ? 80 : each.value.exposed_container_port
  protocol         = "HTTP"
  protocol_version = each.value.protocol_version
  vpc_id           = data.terraform_remote_state.environment_base.outputs.vpc_id

  lifecycle {
    create_before_destroy = true
  }

  health_check {
    healthy_threshold   = each.value.healthy_threshold   //5
    unhealthy_threshold = each.value.unhealthy_threshold //2
    interval            = each.value.interval            //30
    matcher             = each.value.matcher             //200
    path                = each.value.health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = each.value.timeout //5
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = each.value.cookie_duration == 0 ? 1 : each.value.cookie_duration // value must be between '1-604800' inclusive, no matter we want to set this or not
    enabled         = each.value.cookie_duration == 0 ? false : true
  }
}
