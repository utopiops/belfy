locals {
  application_name        = random_string.rand_8.result
  fqdn                    = data.terraform_remote_state.environment_base.outputs.fqdn
  env_resource_group_name = data.terraform_remote_state.environment_base.outputs.resource_group_name
  location                = data.terraform_remote_state.environment_base.outputs.location
}
