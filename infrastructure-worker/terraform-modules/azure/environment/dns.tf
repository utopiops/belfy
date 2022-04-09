resource "azurerm_dns_zone" "this" {
  name                = local.fqdn
  resource_group_name = azurerm_resource_group.environment.name
}

# resource "azurerm_private_dns_zone" "this" {
#   name                = format("internal.%s", local.fqdn)
#   resource_group_name = azurerm_resource_group.environment.name
# }

# # Link the Private DNS Zone with the VNET
# resource "azurerm_private_dns_zone_virtual_network_link" "this" {
#   name                  = local.environment_name
#   resource_group_name   = azurerm_resource_group.environment.name
#   private_dns_zone_name = azurerm_private_dns_zone.this.name
#   virtual_network_id    = azurerm_virtual_network.this.id
# }


resource "azurerm_private_dns_zone" "private_endpoint" {
  for_each = toset(var.enabled_subresources)
  name                = lookup(local.subresource_to_dns_zone, each.key)
  resource_group_name = azurerm_resource_group.environment.name
  tags = { 
    "Created-By"  = "UTOPIOPS-WATER"
    "Environment" = var.environment
  }
}

resource "azurerm_private_dns_zone_virtual_network_link" "private_endpoint" {
  for_each = toset(var.enabled_subresources)
  name                  = format("%s-%s", local.environment_name, each.key)
  resource_group_name   = azurerm_resource_group.environment.name
  private_dns_zone_name = azurerm_private_dns_zone.private_endpoint[each.key].name
  virtual_network_id    = azurerm_virtual_network.this.id
  tags = { 
    "Created-By"  = "UTOPIOPS-WATER"
    "Environment" = var.environment
  }
}