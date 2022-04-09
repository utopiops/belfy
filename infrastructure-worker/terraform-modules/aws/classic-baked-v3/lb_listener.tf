resource "aws_lb_listener_rule" "alb_listener_rule" {
  for_each     = { for index, port in var.alb_exposed_ports.ports : tostring(port.host_port) => port }
  listener_arn = data.terraform_remote_state.environment_base.outputs.alb_listener["${var.alb_exposed_ports.alb_display_name}.${each.value.load_balancer_port}"].arn
  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.alb_target_group[each.value.host_port].arn
  }
  condition {
    host_header {
      values = [format("%s.%s", length(each.value.dns_prefix) > 0 ? "${each.value.dns_prefix}__${var.app_name}" : var.app_name, local.env_domain_name)]
    }
  }

  # depends_on = ["aws_alb_target_group.target_group"]
}


