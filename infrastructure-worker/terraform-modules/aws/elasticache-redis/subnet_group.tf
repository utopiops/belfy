resource "aws_elasticache_subnet_group" "main" {
  name       = local.cluster_name
  subnet_ids = data.terraform_remote_state.environment_base.outputs.private_subnets
}
