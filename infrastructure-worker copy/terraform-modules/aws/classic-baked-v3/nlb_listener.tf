resource "aws_lb_listener" "nlb_listener" {
  for_each          = { for index, port in var.nlb_exposed_ports.ports : tostring(port.port_number) => port }
  load_balancer_arn = data.terraform_remote_state.environment_base.outputs.nlbs[var.nlb_exposed_ports.nlb_display_name].arn
  port              = each.value.port_number
  protocol          = each.value.protocol
  ssl_policy        = each.value.protocol == "TLS" ? "ELBSecurityPolicy-2016-08" : null
  certificate_arn   = each.value.protocol == "TLS" ? each.value.certificate_arn : null
  alpn_policy       = each.value.protocol == "TLS" ? "HTTP2Preferred" : null
  default_action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.nlb_target_group[each.value.port_number].arn
  }

}
