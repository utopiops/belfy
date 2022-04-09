# See: https://docs.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq

# Azure services that connect to VNets see: https://docs.microsoft.com/en-us/azure/virtual-network/virtual-networks-faq#azure-services-that-connect-to-vnets


resource "azurerm_virtual_network" "this" {
  name                = local.environment_name
  location            = azurerm_resource_group.environment.location
  resource_group_name = azurerm_resource_group.environment.name
  address_space       = [var.address_space]

  # dynamic "subnet" {
  #   for_each = local.named_cidrs
  #   iterator = named_cidr
  #   content {
  #     name           = format("%s-%s", local.environment_name, named_cidr.key)
  #     address_prefix = named_cidr.value
  #     security_group = azurerm_network_security_group.subnet[named_cidr.key].id
  #   }
  # }

  dynamic "ddos_protection_plan" {
    for_each = toset(var.enable_vnet_ddos_protection ? ["1"] : [])
    content {
      id     = azurerm_network_ddos_protection_plan.vnet["1"].id
      enable = true
    }
  }

  tags = {
    "Created-By"  = "UTOPIOPS-WATER"
    "Environment" = var.environment
  }
}


resource "azurerm_subnet" "this" {
  for_each                                       = local.subnet_blocks
  name                                           = format("%s-%s", local.environment_name, each.key)
  resource_group_name                            = azurerm_resource_group.environment.name
  virtual_network_name                           = azurerm_virtual_network.this.name
  address_prefixes                               = [each.value.cidr]
  service_endpoints                              = each.value.service_endpoints
  enforce_private_link_endpoint_network_policies = each.value.enforce_private_link_endpoint_network_policies
  enforce_private_link_service_network_policies  = each.value.enforce_private_link_service_network_policies
}

resource "azurerm_network_security_group" "subnet" {
  for_each            = local.subnet_blocks
  name                = format("%s-%s", local.environment_name, each.key)
  location            = azurerm_resource_group.environment.location
  resource_group_name = azurerm_resource_group.environment.name
}

resource "azurerm_subnet_network_security_group_association" "vnet" {
  for_each                  = local.subnet_blocks
  subnet_id                 = azurerm_subnet.this[each.key].id
  network_security_group_id = azurerm_network_security_group.subnet[each.key].id
}

resource "azurerm_network_ddos_protection_plan" "vnet" {
  for_each            = toset(var.enable_vnet_ddos_protection ? ["1"] : [])
  name                = local.environment_name
  location            = azurerm_resource_group.environment.location
  resource_group_name = azurerm_resource_group.environment.name
}

