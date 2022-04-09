output "resource_group_name" {
  value = azurerm_resource_group.environment.name
}

output "location" {
  value = var.location
}

# output "private_dns_zone_name" {
#   value = azurerm_private_dns_zone.this.name
# }

output "dns_zone_name" {
  value = azurerm_dns_zone.this.name
}

output "cidrs" {
  value = local.subnet_blocks
}

output "fqdn" {
  value = local.fqdn
}

output "env_name_servers" {
  value = var.domain.create ? azurerm_dns_zone.this.name_servers : []
}

# Sample output:

# cidrs = {
#   "ad" = {
#     "cidr" = "10.0.128.0/18"
#     "enforce_private_link_endpoint_network_policies" = false
#     "enforce_private_link_service_network_policies" = false
#     "service_endpoints" = []
#   }
#   "data" = {
#     "cidr" = "10.0.224.0/22"
#     "enforce_private_link_endpoint_network_policies" = true
#     "enforce_private_link_service_network_policies" = false
#     "service_endpoints" = []
#   }
#   "etc" = {
#     "cidr" = "10.0.192.0/19"
#     "enforce_private_link_endpoint_network_policies" = false
#     "enforce_private_link_service_network_policies" = false
#     "service_endpoints" = []
#   }
#   "private" = {
#     "cidr" = "10.0.64.0/18"
#     "enforce_private_link_endpoint_network_policies" = false
#     "enforce_private_link_service_network_policies" = false
#     "service_endpoints" = []
#   }
#   "public" = {
#     "cidr" = "10.0.0.0/18"
#     "enforce_private_link_endpoint_network_policies" = false
#     "enforce_private_link_service_network_policies" = false
#     "service_endpoints" = []
#   }
# }
# dns_zone_name = "test.utopiops.com"
# location = "West US 2"
# resource_group_name = "test-27ln3gy1"
