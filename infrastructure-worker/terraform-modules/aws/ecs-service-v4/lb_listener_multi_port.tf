resource "aws_lb_listener_rule" "multi_port" {
  for_each     = { for exposed_port in var.exposed_ports : "${exposed_port.exposed_container_name}.${exposed_port.exposed_container_port}" => exposed_port }
  listener_arn = data.terraform_remote_state.environment_base.outputs.alb_listener["${each.value.alb_name}.${each.value.alb_listener_port}"].arn
  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.multi_port[each.key].arn
  }
  condition {
    host_header {
      values = [local.fqdns[each.key]]
    }
  }

  depends_on = [aws_alb_target_group.multi_port]
}


resource "aws_lb_listener_certificate" "multi_port" {
  for_each        = { for exposed_port in var.exposed_ports : "${exposed_port.exposed_container_name}.${exposed_port.exposed_container_port}" => exposed_port if length(exposed_port.certificate_arn) > 0 }
  listener_arn    = aws_lb_listener_rule.multi_port[each.key].listener_arn
  certificate_arn = each.value.certificate_arn
}
