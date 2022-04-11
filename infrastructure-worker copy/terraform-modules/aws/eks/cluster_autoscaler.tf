
# resource "helm_release" "cluster_autoscaler" {
#   name       = "cluster-autoscaler"
#   repository = "stable"
#   chart      = "cluster-autoscaler"
#   namespace  = "kube-system"
#   # version    = "0.12.2"

#   values = [
#     file("${path.module}/cluster_autoscaler_values.yaml")
#   ]
#   set {
#     name  = "autoDiscovery.enabled"
#     value = "true"
#   }

#   set {
#     name  = "autoDiscovery.clusterName"
#     value = local.cluster_name
#   }

#   set {
#     name  = "cloudProvider"
#     value = "aws"
#   }

#   set {
#     name  = "awsRegion"
#     value = var.region
#   }

#   set {
#     name  = "rbac.create"
#     value = "true"
#   }

#   set {
#     name  = "sslCertPath"
#     value = "/etc/ssl/certs/ca-bundle.crt"
#   }

#   depends_on = [
#     local_file.eks_kubeconfig
#   ]

# }