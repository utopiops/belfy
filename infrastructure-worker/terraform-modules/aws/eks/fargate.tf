resource "aws_eks_fargate_profile" "fargate" {
  for_each               = { for profile in var.fargate_profiles : profile.name => profile }
  cluster_name           = aws_eks_cluster.eks_cluster.name
  fargate_profile_name   = each.key
  pod_execution_role_arn = aws_iam_role.fargate.arn
  subnet_ids             = data.terraform_remote_state.environment_base.outputs.private_subnets

  selector {
    namespace = each.value.namespace
    labels    = each.value.labels
  }
  timeouts {
    create = "20m"
    delete = "20m"
  }
}


resource "aws_iam_role" "fargate" {
  name = format("%s-fargate", local.cluster_name)

  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "eks-fargate-pods.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })
}