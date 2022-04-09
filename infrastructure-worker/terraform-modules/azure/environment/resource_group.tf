resource "random_string" "rand_8" {
  length  = 8
  upper   = false
  special = false
}


resource "azurerm_resource_group" "environment" {
  name     = local.environment_name
  location = var.location
}
