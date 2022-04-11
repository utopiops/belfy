provider "archive" {
  # version = "1.0.0"
}

# data "archive_file" "helm_manager_proxy_layer_zip" {
#   type        = "zip"
#   source_dir  = "${path.module}/lambda/helm-manager/lib"
#   output_path = "${path.module}/helm_manager_proxy_layer.zip"
# }

resource "aws_lambda_layer_version" "helm_manager_proxy_layer" {
  # filename   = data.archive_file.helm_manager_proxy_layer_zip.output_path
  filename   = "${path.module}/lambda/helm-manager/layer.zip"
  layer_name = format("%s_layer", local.cluster_name)

  compatible_runtimes = ["nodejs12.x"]

  source_code_hash = filebase64sha256("${path.module}/lambda/helm-manager/layer.zip")
}

resource "aws_ssm_parameter" "helm_manager_service_url" {
  name      = format("%s-helm-manager-service-url", local.cluster_name)
  type      = "String"
  value     = "willFillInAddDependenciesFile"
  overwrite = true
}


data "archive_file" "helm_manager_proxy_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/helm-manager/index.js"
  output_path = "${path.module}/index.zip"
}

data "aws_iam_policy" "lambda_vpc_access" {
  arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_policy" "lambda_parameter_access" {
  name        = format("%s-lambda-parameter-access", local.cluster_name)
  description = format("EKS cluster %s lambda function access to parameter policy", local.cluster_name)
  policy      = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameterHistory",
        "ssm:GetParametersByPath",
        "ssm:GetParameters",
        "ssm:GetParameter"
      ],
      "Resource": "*"
    }
  ]
}
POLICY
}

resource "aws_iam_role" "lambda_exec_role" {
  assume_role_policy = <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": "sts:AssumeRole",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Effect": "Allow"
    }
  ]
}
EOF
}

resource "aws_iam_role_policy_attachment" "lambda-vpc-role-policy-attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = data.aws_iam_policy.lambda_vpc_access.arn
}

resource "aws_iam_role_policy_attachment" "lambda-parameter-role-policy-attach" {
  role       = aws_iam_role.lambda_exec_role.name
  policy_arn = aws_iam_policy.lambda_parameter_access.arn
}

resource "aws_lambda_function" "helm_manager_proxy_lambda" {
  filename = data.archive_file.helm_manager_proxy_zip.output_path

  function_name = format("%s_helm_manager_proxy", local.cluster_name)
  handler       = "index.handler"
  role          = aws_iam_role.lambda_exec_role.arn
  runtime       = "nodejs12.x"
  publish       = true
  timeout       = 30

  source_code_hash = filebase64sha256(data.archive_file.helm_manager_proxy_zip.output_path)

  vpc_config {
    subnet_ids         = data.terraform_remote_state.environment_base.outputs.private_subnets // Same subnets as the RDS
    security_group_ids = [aws_security_group.eks_sg.id]
  }

  environment {
    variables = {
      PARAM_NAME = format("%s-helm-manager-service-url", local.cluster_name)
    }
  }

  layers = [aws_lambda_layer_version.helm_manager_proxy_layer.arn]
}

