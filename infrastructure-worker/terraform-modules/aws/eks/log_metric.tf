resource "aws_iam_role" "irsa-metrics" {
  for_each            = toset(var.enable_insights ? ["1"] : [])
  name                = "cloudwatch-agent-role"
  path                = "/"
  managed_policy_arns = ["arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"]
  tags                = var.tags

  assume_role_policy = templatefile("${path.module}/irsa-metrics.tmpl.json", {
    oidc_arn : local.oidc.arn,
    condition_key : format("%s:sub", local.oidc.url)
  })
}

resource "aws_iam_role" "irsa-logs" {
  for_each            = toset(var.enable_insights ? ["1"] : [])
  name                = "fluentd-role"
  path                = "/"
  tags                = var.tags
  managed_policy_arns = ["arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy"]
  assume_role_policy = templatefile("${path.module}/irsa-logs.tmpl.json", {
    oidc_arn : local.oidc.arn,
    condition_key : format("%s:sub", local.oidc.url)
  })
}


resource "local_file" "cloudwatch_insights" {
  for_each = toset(var.enable_insights ? ["1"] : [])
  content = templatefile("${path.module}/cloudwatch-insights.yaml", {
    region : var.region,
    cluster_name : aws_eks_cluster.eks_cluster.name,
    cloudwatch_agent_role : aws_iam_role.irsa-metrics["1"].arn,
    fluentd_role : aws_iam_role.irsa-logs["1"].arn
  })

  filename        = "${path.module}/cloudwatch_insights.yaml"
  file_permission = "0644"
}


resource "null_resource" "enable_cloudwatch_insights" {
  for_each = toset(var.enable_insights ? ["1"] : [])
  provisioner "local-exec" {
    when = create
    command = templatefile("${path.module}/enable_cloudwatch_insights.tmpl.sh", {
      kubeconfig          = local_file.eks_kubeconfig.filename,
      cloudwatch-insights = "${path.module}/cloudwatch_insights.yaml"
    })
  }

  triggers = {
    config              = local_file.eks_kubeconfig.content
    cloudwatch_insights = local_file.cloudwatch_insights["1"].content
  }
}

resource "aws_cloudwatch_log_group" "insights" {
  for_each          = toset(var.enable_insights ? ["1"] : [])
  name              = format("/aws/containerinsights/%s/application", local.cluster_name)
  retention_in_days = var.retention_in_days
}
resource "aws_cloudwatch_log_group" "insights_host" {
  for_each          = toset(var.enable_insights ? ["1"] : [])
  name              = format("/aws/containerinsights/%s/host", local.cluster_name)
  retention_in_days = var.retention_in_days
}
resource "aws_cloudwatch_log_group" "insights_dataplane" {
  for_each          = toset(var.enable_insights ? ["1"] : [])
  name              = format("/aws/containerinsights/%s/dataplane", local.cluster_name)
  retention_in_days = var.retention_in_days
}
