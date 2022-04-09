resource "random_string" "rand_8" {
  length  = 8
  upper   = false
  special = false
}

locals {
  environment_name = format("%s-%s", var.environment, random_string.rand_8.result)
  cidrs            = cidrsubnets(var.address_space, 2) // One cidr only at the moment
  subnets = {
    "${lower(var.region)}" = {
      cidr = local.cidrs[0]
    }
  }

  fqdn = var.dns.is_own ? format("%s.%s", var.environment, var.dns.parent_domain) : var.dns.parent_domain

}
