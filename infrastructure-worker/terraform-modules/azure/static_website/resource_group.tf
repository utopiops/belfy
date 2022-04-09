resource "random_string" "rand_8" {
  length  = 8
  upper   = false
  special = false
}


resource "azurerm_resource_group" "this" {
  name     = local.application_name
  location = local.location
}
