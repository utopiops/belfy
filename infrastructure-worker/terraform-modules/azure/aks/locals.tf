resource "random_id" "random_8b" {
    byte_length = 8
}

locals {
  cluster_name = format("%s-%s-%s", var.environment, var.cluster_name, random_id.random_8b.dec)
  env_resource_group_name = data.terraform_remote_state.environment_base.outputs.resource_group_name

}
