locals {
  environment_name = format("%s-%s", var.environment, random_string.rand_8.result)
  cidrs            = cidrsubnets(var.address_space, 2, 2, 2, 3, 6) // public, private, AD, etc, data

  subnet_blocks = {
    "public" = {
      cidr = local.cidrs[0]
      service_endpoints = []
      enforce_private_link_endpoint_network_policies = false // Note: these two conflict
      enforce_private_link_service_network_policies = false
    }
    "private" = {
      cidr = local.cidrs[1]
      service_endpoints = []
      enforce_private_link_endpoint_network_policies = false
      enforce_private_link_service_network_policies = false
    }
    "ad" = {
      cidr = local.cidrs[2]
      service_endpoints = []
      enforce_private_link_endpoint_network_policies = false
      enforce_private_link_service_network_policies = false
    }
    "etc" = {
      cidr = local.cidrs[3]
      service_endpoints = []
      enforce_private_link_endpoint_network_policies = false
      enforce_private_link_service_network_policies = false
    }
    "data" = {
      cidr = local.cidrs[4]
      service_endpoints = []
      enforce_private_link_endpoint_network_policies = true
      enforce_private_link_service_network_policies = false
    }
  }

  fqdn = var.domain.dns

  subresource_to_dns_zone = {
    "mysqlServer" = "privatelink.mysql.database.azure.com"
  }
}
