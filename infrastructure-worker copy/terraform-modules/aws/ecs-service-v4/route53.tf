locals {
  # Note: fqdn and fqdns won't ever be used at the same time
  fqdn        = format("%s.%s", var.app_name, data.terraform_remote_state.environment_base.outputs.env_domain_name)
  fqdns       = { for exposed_port in var.exposed_ports : "${exposed_port.exposed_container_name}.${exposed_port.exposed_container_port}" => format("%s.%s", length(exposed_port.domain_suffix) > 0 ? "${var.app_name}-${exposed_port.domain_suffix}" : var.app_name, data.terraform_remote_state.environment_base.outputs.env_domain_name) }
  can_set_dns = data.terraform_remote_state.environment_base.outputs.env_hosted_zone_id != null ? true : false
}

resource "aws_route53_record" "single_port" {
  for_each = toset(length(var.exposed_ports) == 0 && local.can_set_dns ? ["1"] : [])
  zone_id  = data.terraform_remote_state.environment_base.outputs.env_hosted_zone_id
  name     = local.fqdn
  type     = "A"

  alias {
    name                   = data.terraform_remote_state.environment_base.outputs.albs[var.alb_name].dns_name
    zone_id                = data.terraform_remote_state.environment_base.outputs.albs[var.alb_name].zone_id
    evaluate_target_health = false
  }
}
