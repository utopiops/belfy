resource "aws_iam_role" "external_dns" {
  name = format("%s-external-dns", local.cluster_name)

  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "${local.oidc.arn}"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "${format("%s:sub", local.oidc.url)}": "system:serviceaccount:kube-system:external-dns"
        }
      }
    }
  ]
}
EOF
}

resource "aws_iam_policy" "external_dns" {
  name        = format("%s-external-dns", local.cluster_name)
  description = format("EKS cluster %s external-dns policy", local.cluster_name)
  policy      = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "route53:ChangeResourceRecordSets"
      ],
      "Resource": [
        "arn:aws:route53:::hostedzone/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "route53:ListHostedZones",
        "route53:ListResourceRecordSets"
      ],
      "Resource": [
        "*"
      ]
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "external_dns_attachment" {
  policy_arn = aws_iam_policy.external_dns.arn
  role       = aws_iam_role.external_dns.name
}

# # Kubernetes service account
# resource "kubernetes_service_account" "external_dns" {
#   metadata {
#     name      = "external-dns"
#     namespace = "kube-system"
#     annotations = {
#       "eks.amazonaws.com/role-arn" = aws_iam_role.external_dns.arn
#     }
#   }
#   automount_service_account_token = true
# }

# # Kubernetes cluster role
# resource "kubernetes_cluster_role" "external_dns" {
#   metadata {
#     name = "external-dns"
#   }

#   rule {
#     api_groups = [""]
#     resources  = ["services", "pods", "nodes"]
#     verbs      = ["get", "list", "watch"]
#   }
#   rule {
#     api_groups = ["extensions", "networking.k8s.io"]
#     resources  = ["ingresses"]
#     verbs      = ["get", "list", "watch"]
#   }
#   rule {
#     api_groups = ["networking.istio.io"]
#     resources  = ["gateways"]
#     verbs      = ["get", "list", "watch"]
#   }
# }

# # Kubernetes cluster role binding
# resource "kubernetes_cluster_role_binding" "external_dns" {
#   metadata {
#     name = "external-dns"
#   }
#   role_ref {
#     api_group = "rbac.authorization.k8s.io"
#     kind      = "ClusterRole"
#     name      = kubernetes_cluster_role.external_dns.metadata.0.name
#   }
#   subject {
#     kind      = "ServiceAccount"
#     name      = kubernetes_service_account.external_dns.metadata.0.name
#     namespace = kubernetes_service_account.external_dns.metadata.0.namespace
#   }
# }

# resource "helm_release" "external_dns" {
#   name       = "external-dns"
#   namespace  = "kube-system"
#   wait       = true
#   repository = "https://charts.bitnami.com/bitnami"
#   chart      = "external-dns"
#   # version    = "6.1.0"

#   set {
#     name  = "rbac.create"
#     value = false
#   }

#   set {
#     name  = "serviceAccount.create"
#     value = false
#   }

#   set {
#     name  = "serviceAccount.name"
#     value = kubernetes_service_account.external_dns.metadata.0.name
#   }

#   set {
#     name  = "rbac.pspEnabled"
#     value = false
#   }

#   set {
#     name  = "name"
#     value = "${local.cluster_name}-external-dns"
#   }

#   set {
#     name  = "provider"
#     value = "aws"
#   }

#   set {
#     name  = "policy"
#     value = "sync"
#   }

#   # set_string {
#   #   name  = "logLevel"
#   #   value = var.external_dns_chart_log_level
#   # }

#   set {
#     name  = "sources"
#     value = "{ingress,service}"
#   }

#   # set {
#   #   name  = "domainFilters"
#   #   value = "{${join(",", var.external_dns_domain_filters)}}"
#   # }

#   # set_string {
#   #   name  = "aws.zoneType"
#   #   value = var.external_dns_zoneType
#   # }

#   set {
#     name  = "aws.region"
#     value = var.region
#   }

#   depends_on = [
#     local_file.eks_kubeconfig
#   ]

# }
