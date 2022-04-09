provider "archive" {
  # version = "1.0.0"
}

locals {
  // We ignore oracle atm
  engine_category = (var.engine == "aurora" || var.engine == "aurora-mysql" || var.engine == "mariadb" || var.engine == "mysql") ? "mysql" : (var.engine == "postgres" || var.engine == "aurora-postgresql") ? "postgres" : "sqlserver"
}

# data "archive_file" "sql_queries_proxy_layer_zip" {
#   type        = "zip"
#   source_dir  = "${path.module}/lambda/${local.engine_category}/lib"
#   output_path = "${path.module}/sql_queries_proxy_layer.zip"
# }

resource "aws_lambda_layer_version" "sql_queries_proxy_layer" {
  # filename   = data.archive_file.sql_queries_proxy_layer_zip.output_path
  filename   = "${path.module}/lambda/${local.engine_category}/layer.zip"
  layer_name = format("%s_layer", local.db_identifier)

  compatible_runtimes = ["nodejs12.x"]

  source_code_hash = filebase64sha256("${path.module}/lambda/${local.engine_category}/layer.zip")
}



data "archive_file" "sql_queries_proxy_zip" {
  type        = "zip"
  source_file = "${path.module}/lambda/${local.engine_category}/index.js"
  output_path = "${path.module}/index.zip"
}

data "aws_iam_policy" "lambda_vpc_access" {
  arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
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

resource "aws_lambda_function" "sql_queries_proxy_lambda" {
  filename = data.archive_file.sql_queries_proxy_zip.output_path

  function_name = format("%s_sql_queries_proxy", local.db_identifier)
  handler       = "index.handler"
  role          = aws_iam_role.lambda_exec_role.arn
  runtime       = "nodejs12.x"
  publish       = true

  source_code_hash = filebase64sha256(data.archive_file.sql_queries_proxy_zip.output_path)

  vpc_config {
    subnet_ids         = data.terraform_remote_state.environment_base.outputs.private_subnets // Same subnets as the RDS
    security_group_ids = [aws_security_group.lambda_sg.id]
  }

  environment {
    variables = {
      databaseHost = module.db_instance.db_instance_address
    }
  }

  layers = [aws_lambda_layer_version.sql_queries_proxy_layer.arn]
}

