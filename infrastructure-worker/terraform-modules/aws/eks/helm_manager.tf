resource "aws_iam_role" "helm_manager" {
  name = format("%s-helm-manager", local.cluster_name)

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
          "${format("%s:sub", local.oidc.url)}": "system:serviceaccount:utopiops:helm-manager"
        }
      }
    }
  ]
}
EOF
}

resource "aws_iam_policy" "helm_manager" {
  name        = format("%s-helm-manager", local.cluster_name)
  description = format("EKS cluster %s helm-manager policy", local.cluster_name)
  policy      = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetResourcePolicy",
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecretVersionIds"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "secretsmanager:ListSecrets",
      "Resource": "*"
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "helm_manager_attachment" {
  policy_arn = aws_iam_policy.helm_manager.arn
  role       = aws_iam_role.helm_manager.name
}
