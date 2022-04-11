resource "aws_alb_target_group" "single_port" {
  for_each     = toset(length(var.exposed_ports) == 0 ? ["single_port"] : [])
  port     = var.exposed_container_port
  protocol = "HTTP"
  vpc_id   = data.terraform_remote_state.environment_base.outputs.vpc_id

  lifecycle {
    create_before_destroy = true
  }

  health_check {
    healthy_threshold   = var.healthy_threshold   //5
    unhealthy_threshold = var.unhealthy_threshold //2
    interval            = var.interval            //30
    matcher             = var.matcher             //200
    path                = var.health_check_path
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = var.timeout //5
  }

  stickiness {
    type            = "lb_cookie"
    cookie_duration = var.cookie_duration == 0 ? 1 : var.cookie_duration // value must be between '1-604800' inclusive, no matter we want to set this or not
    enabled         = var.cookie_duration == 0 ? false : true
  }
}
