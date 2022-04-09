terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
    }
    
  }
  backend "s3" {
    encrypt = true
  }
}

provider "aws" {
  region = var.region
}

data "aws_eks_cluster_auth" "cluster_auth" {
  depends_on = [aws_eks_cluster.eks_cluster]
  name       = aws_eks_cluster.eks_cluster.name
}

provider "helm" {
  kubernetes {
    host                   = aws_eks_cluster.eks_cluster.endpoint
    cluster_ca_certificate = base64decode(aws_eks_cluster.eks_cluster.certificate_authority.0.data)
    token                  = data.aws_eks_cluster_auth.cluster_auth.token

    config_paths = [
      local_file.eks_kubeconfig.filename
      # "${path.module}/generated/.kube/config"
    ]
  }
}

provider "kubernetes" {
  config_path    = local_file.eks_kubeconfig.filename
}