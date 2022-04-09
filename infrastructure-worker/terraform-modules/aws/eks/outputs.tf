output "eks_aws_auth" {
  value = local_file.eks_aws_auth.content
}

output "eks_cluster_name" {
  value = local.cluster_name
}

output "eks_kubeconfig" {
  value = local_file.eks_kubeconfig.content
}

output "kubeconfig_secret_name" {
  value = aws_secretsmanager_secret.kubeconfig.name
}



# Outputs:

# eks_aws_auth = <<EOT
# apiVersion: v1
# kind: ConfigMap
# metadata:
#   name: aws-auth
#   namespace: kube-system
# data:
#   mapRoles: |
#     - rolearn: arn:aws:iam::994147050565:role/mohsen-mytest-411e3c90-7834-8ec4-bb2e-17640fff9e8c-worker-role
#       username: system:node:{{EC2PrivateDNSName}}
#       groups:
#         - system:bootstrappers
#         - system:nodes

# EOT
# eks_cluster_name = "mohsen-mytest-411e3c90-7834-8ec4-bb2e-17640fff9e8c"
# eks_kubeconfig = <<EOT
# apiVersion: v1
# clusters:
# - cluster:
#     server: https://E647814E08DEE0E952BC87B1C278A8A8.gr7.us-east-2.eks.amazonaws.com
#     certificate-authority-data: LS0tLS1CRUdJTiBxxxxxxxxxxxxxxxxxxxxxxxxx1JMgotLS0tLUVORCBDRVJUSUZJQ0FURS0tLS0tCg==
#   name: kubernetes
# contexts:
# - context:
#     cluster: kubernetes
#     user: aws
#   name: aws
# current-context: aws
# kind: Config
# preferences: {}
# users:
# - name: aws
#   user:
#     exec:
#       apiVersion: client.authentication.k8s.io/v1alpha1
#       command: aws-iam-authenticator
#       args:
#         - "token"
#         - "-i"
#         - "mohsen-mytest-411e3c90-7834-8ec4-bb2e-17640fff9e8c"

# EOT
# kubeconfig_secret_name = "mohsen-mytest-411e3c90-7834-8ec4-bb2e-17640fff9e8c-kubeconfig-base64-encoded"