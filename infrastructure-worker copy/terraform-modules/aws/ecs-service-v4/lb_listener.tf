resource "aws_lb_listener_rule" "single_port" {
  for_each     = toset(length(var.exposed_ports) == 0 ? ["single_port"] : [])
  listener_arn = data.terraform_remote_state.environment_base.outputs.alb_listener["${var.alb_name}.${var.alb_listener_port}"].arn
  action {
    type             = "forward"
    target_group_arn = aws_alb_target_group.single_port[each.key].arn
  }
  condition {
    host_header {
      values = [local.fqdn]
    }
  }

  depends_on = [aws_alb_target_group.single_port["single_port"]]
}


resource "aws_lb_listener_certificate" "single_port" {
  for_each        = toset(length(var.exposed_ports) == 0 && length(var.certificate_arn) > 0 ? ["single_port"] : [])
  listener_arn    = aws_lb_listener_rule.single_port[each.key].listener_arn
  certificate_arn = var.certificate_arn
}
