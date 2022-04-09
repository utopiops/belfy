output "storage_account_name" {
  value = azurerm_storage_account.tfstate.name
}

output "container_name" {
  value = azurerm_storage_container.tfstate.name
}

output "resource_group_name" {
  value = azurerm_resource_group.tfstate.name
}

# Sample output:
# container_name = "tfstate"
# resource_group_name = "mohsentestresourc"
# storage_account_name = "mohsentestaccount"