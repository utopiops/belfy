data "terraform_remote_state" "environment_base" {
  backend = "azurerm"
  config = {
    resource_group_name  = var.environment_state.resource_group_name
    storage_account_name = var.environment_state.storage_account_name
    container_name       = var.environment_state.container_name
    key                  = var.environment_state.key
  }
}
