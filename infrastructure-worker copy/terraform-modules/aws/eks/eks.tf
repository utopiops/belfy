resource "random_string" "random" {
  length  = 8
  special = false
}

locals {
  cluster_name = format("%s-%s-%s", var.environment, var.eks_cluster_name, random_string.random.result)
}


resource "aws_eks_cluster" "eks_cluster" {
  name = local.cluster_name

  role_arn                  = aws_iam_role.eks_iam_role.arn
  version                   = var.eks_version
  enabled_cluster_log_types = var.eks_enabled_cluster_log_types
  vpc_config {
    endpoint_private_access = var.eks_endpoint_private_access
    endpoint_public_access  = var.eks_public_access
    subnet_ids              = concat(data.terraform_remote_state.environment_base.outputs.private_subnets, data.terraform_remote_state.environment_base.outputs.public_subnets)
    security_group_ids      = [aws_security_group.eks_sg.id]
  }

  depends_on = [
    aws_iam_role_policy_attachment.eks_AmazonEKSClusterPolicy_attachment,
    aws_iam_role_policy_attachment.eks_AmazonEKSServicePolicy_attachment,
  ]
}


# iam
resource "aws_iam_role" "eks_iam_role" {
  name               = format("%s-role", local.cluster_name)
  description        = format("%s EKS cluster IAM role", local.cluster_name)
  assume_role_policy = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "eks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
POLICY
  tags               = var.tags
}

resource "aws_iam_role_policy_attachment" "eks_AmazonEKSClusterPolicy_attachment" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy"
  role       = aws_iam_role.eks_iam_role.name
}

# Optionally, enable Security Groups for Pods
# Reference: https://docs.aws.amazon.com/eks/latest/userguide/security-groups-for-pods.html
resource "aws_iam_role_policy_attachment" "eks_AmazonEKSServicePolicy_attachment" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSServicePolicy"
  role       = aws_iam_role.eks_iam_role.name
}


resource "aws_iam_role_policy_attachment" "fargate-AmazonEKSFargatePodExecutionRolePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSFargatePodExecutionRolePolicy"
  role       = aws_iam_role.fargate.name
}


# sg
resource "aws_security_group" "eks_sg" {
  name        = local.cluster_name
  description = format("Cluster %s security group", local.cluster_name)
  vpc_id      = data.terraform_remote_state.environment_base.outputs.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = (merge(
    tomap({
      "kubernetes.io/cluster/${local.cluster_name}" = "owned"
    }),
    var.tags
  ))
}


resource "aws_security_group_rule" "eks_sg_apiserver_rule" {
  description       = "Allow local terraform orchestration instances nat ip to communicate with the cluster API Server"
  from_port         = 443
  protocol          = "tcp"
  security_group_id = aws_security_group.eks_sg.id
  cidr_blocks       = ["0.0.0.0/0"]
  to_port           = 443
  type              = "ingress"
}


resource "local_file" "eks_kubeconfig" {
  content         = <<KUBECONFIG
apiVersion: v1
clusters:
- cluster:
    server: ${aws_eks_cluster.eks_cluster.endpoint}
    certificate-authority-data: ${aws_eks_cluster.eks_cluster.certificate_authority.0.data}
  name: kubernetes
contexts:
- context:
    cluster: kubernetes
    user: aws
  name: aws
current-context: aws
kind: Config
preferences: {}
users:
- name: aws
  user:
    exec:
      apiVersion: client.authentication.k8s.io/v1alpha1
      command: aws
      args:
        - "eks"
        - "get-token"
        - "--cluster-name"
        - "${local.cluster_name}"
KUBECONFIG
  filename        = "${path.module}/kube_config"
  file_permission = "0400"
}

resource "aws_secretsmanager_secret" "kubeconfig" {
  name                    = format("%s-kubeconfig-base64-encoded", local.cluster_name)
  description             = format("EKS cluster %s kube config", local.cluster_name)
  recovery_window_in_days = 0
}

resource "aws_secretsmanager_secret_version" "kubeconfig_data" {
  secret_id     = aws_secretsmanager_secret.kubeconfig.id
  secret_string = local_file.eks_kubeconfig.content
}
