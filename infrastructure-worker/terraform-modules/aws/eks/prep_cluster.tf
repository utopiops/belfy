resource "local_file" "external_dns_sa" {
  content         = <<KUBECONFIG
apiVersion: v1
kind: ServiceAccount
metadata:
  name: external-dns
  annotations:
    eks.amazonaws.com/role-arn: ${aws_iam_role.external_dns.arn}
KUBECONFIG
  filename        = "${path.module}/external_dns_sa.yaml"
  file_permission = "0400"
}

resource "local_file" "cert_manager_values" {
  content         = <<EOF
securityContext:
  enabled: "true"
serviceAccount:
  annotations:
    eks.amazonaws.com/role-arn: ${aws_iam_role.cert_manager.arn}
EOF
  filename        = "${path.module}/cert_manager_values.yaml"
  file_permission = "0400"
}

resource "local_file" "letsencrypt_issuer" {
  content         = <<KUBECONFIG
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
  namespace: cert-manager
spec:
  acme:
    # The ACME server URL
    server: https://acme-v02.api.letsencrypt.org/directory
    # Email address used for ACME registration
    email: certmgr@utopiops.com
    # Name of a secret used to store the ACME account private key
    privateKeySecretRef:
      name: letsencrypt-prod
    # Enable the HTTP-01 challenge provider
    solvers:
      - dns01:
          route53:
            region: ${var.region}
KUBECONFIG
  filename        = "${path.module}/letsencrypt_issuer.yaml"
  file_permission = "0400"
}

resource "local_file" "helm_manager_sa" {
  content         = <<KUBECONFIG
apiVersion: v1
kind: ServiceAccount
metadata:
  name: helm-manager
  annotations:
    eks.amazonaws.com/role-arn: ${aws_iam_role.helm_manager.arn}
KUBECONFIG
  filename        = "${path.module}/helm_manager_sa.yaml"
  file_permission = "0400"
}

resource "local_file" "helm_manager_deployment" {
  content         = <<KUBECONFIG
apiVersion: apps/v1
kind: Deployment
metadata:
  name: helm-manager-deployment
  labels:
    app: helm-manager
spec:
  replicas: 1
  selector:
    matchLabels:
      app: helm-manager
  template:
    metadata:
      labels:
        app: helm-manager
    spec:
      serviceAccountName: helm-manager
      containers:
      - name: helm-manager
        image: hojjat12/helm-manager:0.2.3
        imagePullPolicy: Always
        env:
        - name: KUBE_CONFIG_SECRET_ARN
          value: ${aws_secretsmanager_secret.kubeconfig.arn}
        - name: CERTIFICATE_ISSUER
          value: letsencrypt-prod
        ports:
        - containerPort: 3000
      securityContext:
        fsGroup: 65534
KUBECONFIG
  filename        = "${path.module}/helm_manager_deployment.yaml"
  file_permission = "0400"
}

resource "local_file" "fluent_bit_configmap" {
  content         = <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: fluent-bit-cluster-info
data:
  cluster.name: ${local.cluster_name}
  http.port: "2020"
  http.server: "On"
  logs.region: ${var.region}
  read.head: "Off"
  read.tail: "On"
EOF
  filename        = "${path.module}/fluent_bit_configmap.yaml"
  file_permission = "0400"
}

resource "null_resource" "add_dependencies" {

  provisioner "local-exec" {
    when = create
    command = templatefile("${path.module}/add_dependencies.tmpl.sh", {
      kubeconfig    = local_file.eks_kubeconfig.filename,
      coredns-patch = "${path.module}/coredns-patch.yaml",
      cluster_name  = local.cluster_name,
      region        = var.region,
      external_dns_sa_path         = local_file.external_dns_sa.filename,
      cert_manager_values_path     = local_file.cert_manager_values.filename,
      letsencrypt_issuer_path      = local_file.letsencrypt_issuer.filename,
      helm_manager_sa_path         = local_file.helm_manager_sa.filename,
      helm_manager_deployment_path = local_file.helm_manager_deployment.filename,
      helm_manager_service_param   = format("%s-helm-manager-service-url", local.cluster_name),
      fluent_bit_configmap_path    = local_file.fluent_bit_configmap.filename
    })
  }

  triggers = {
    config = local_file.eks_kubeconfig.content
    always_run = "${timestamp()}"
  }
}

resource "null_resource" "delete_dependencies" {

  provisioner "local-exec" {
    when = destroy
    command = templatefile("${self.triggers.tmpfile}", {
      kubeconfig_secret_arn = "${self.triggers.kubeconfig_secret_arn}",
      region = "${self.triggers.region}"
    })
  }

  triggers = {
    tmpfile = "${path.module}/delete_dependencies.tmpl.sh"
    kubeconfig_secret_arn = aws_secretsmanager_secret.kubeconfig.arn
    region = var.region
  }
}
