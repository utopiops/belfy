resource "aws_route53_record" "multip_port" {
  for_each = { for exposed_port in var.exposed_ports : "${exposed_port.exposed_container_name}.${exposed_port.exposed_container_port}" => exposed_port if local.can_set_dns }
  zone_id  = data.terraform_remote_state.environment_base.outputs.env_hosted_zone_id
  name     = format("%s.%s", length(each.value.domain_suffix) > 0 ? "${var.app_name}-${each.value.domain_suffix}" : var.app_name, data.terraform_remote_state.environment_base.outputs.env_domain_name)
  type     = "A"

  alias {
    name                   = data.terraform_remote_state.environment_base.outputs.albs[each.value.alb_name].dns_name
    zone_id                = data.terraform_remote_state.environment_base.outputs.albs[each.value.alb_name].zone_id
    evaluate_target_health = false
  }
}
