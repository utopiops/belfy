locals {
  # alb_fqdn    = format("%s.%s", length(var.alb_listener.dns_prefix) > 0 ? "${var.alb_listener.dns_prefix}__${var.app_name}" : var.app_name, data.terraform_remote_state.environment_base.outputs.env_domain_name)
  env_domain_name = data.terraform_remote_state.environment_base.outputs.env_domain_name
  can_set_dns     = data.terraform_remote_state.environment_base.outputs.env_hosted_zone_id != null ? true : false
}

resource "aws_route53_record" "main" {
  for_each = { for index, port in var.alb_exposed_ports.ports : tostring(port.host_port) => port if local.can_set_dns }
  zone_id  = data.terraform_remote_state.environment_base.outputs.env_hosted_zone_id
  name     = format("%s.%s", length(each.value.dns_prefix) > 0 ? "${each.value.dns_prefix}__${var.app_name}" : var.app_name, local.env_domain_name)
  type     = "A"

  alias {
    name                   = data.terraform_remote_state.environment_base.outputs.albs[var.alb_exposed_ports.alb_display_name].dns_name
    zone_id                = data.terraform_remote_state.environment_base.outputs.albs[var.alb_exposed_ports.alb_display_name].zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "nlb_records" {
  for_each = { for index, port in var.nlb_exposed_ports.ports : tostring(port.port_number) => port if local.can_set_dns }
  zone_id  = data.terraform_remote_state.environment_base.outputs.env_hosted_zone_id
  name     = format("%s.%s", length(each.value.dns_prefix) > 0 ? "${each.value.dns_prefix}__${var.app_name}" : var.app_name, local.env_domain_name)
  type     = "A"

  alias {
    name                   = data.terraform_remote_state.environment_base.outputs.nlbs[var.nlb_exposed_ports.nlb_display_name].dns_name
    zone_id                = data.terraform_remote_state.environment_base.outputs.nlbs[var.nlb_exposed_ports.nlb_display_name].zone_id
    evaluate_target_health = false
  }
}
