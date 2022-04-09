// public subnets 

resource "aws_ec2_tag" "public_subnet_cluster_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.public_subnets)
  resource_id = each.key
  key         = "kubernetes.io/cluster/${local.cluster_name}"
  value       = "shared"
}

resource "aws_ec2_tag" "public_subnet_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.public_subnets)
  resource_id = each.key
  key         = "kubernetes.io/role/elb"
  value       = "1"
}

resource "aws_ec2_tag" "public_subnet_cluster_autoscaler_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.public_subnets)
  resource_id = each.value
  key         = "k8s.io/cluster-autoscaler/${local.cluster_name}"
  value       = "owned"
}

resource "aws_ec2_tag" "public_subnet_cluster_autoscaler_enabled_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.public_subnets)
  resource_id = each.value
  key         = "k8s.io/cluster-autoscaler/enabled"
  value       = "true"
}


// private subnets

resource "aws_ec2_tag" "private_subnet_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.private_subnets)
  resource_id = each.key
  key         = "kubernetes.io/role/internal-elb"
  value       = "1"
}

resource "aws_ec2_tag" "private_subnet_cluster_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.private_subnets)
  resource_id = each.key
  key         = "kubernetes.io/cluster/${local.cluster_name}"
  value       = "shared"
}

resource "aws_ec2_tag" "private_subnet_cluster_autoscaler_enabled_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.private_subnets)
  resource_id = each.value
  key         = "k8s.io/cluster-autoscaler/enabled"
  value       = "true"
}
resource "aws_ec2_tag" "private_subnet_cluster_autoscaler_tag" {
  for_each    = toset(data.terraform_remote_state.environment_base.outputs.private_subnets)
  resource_id = each.value
  key         = "k8s.io/cluster-autoscaler/${local.cluster_name}"
  value       = "owned"
}


// vpc
resource "aws_ec2_tag" "vpc_tag" {
  resource_id = data.terraform_remote_state.environment_base.outputs.vpc_id
  key         = "kubernetes.io/cluster/${local.cluster_name}"
  value       = "shared"
}
