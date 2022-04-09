resource "aws_eks_node_group" "workers" {
  for_each        = { for node_group in var.instance_groups : node_group.name => node_group }
  cluster_name    = aws_eks_cluster.eks_cluster.name
  node_group_name = each.key
  node_role_arn   = aws_iam_role.eks_worker_iam_role.arn
  subnet_ids      = data.terraform_remote_state.environment_base.outputs.private_subnets
  capacity_type   = each.value.capacity_type
  disk_size       = var.worker_launch_template == null ? each.value.disk_size : null // We ignore disk_size if var.worker_launch_template is not null

  instance_types = each.value.instance_types

  scaling_config {
    desired_size = each.value.desired_size
    max_size     = each.value.max_size
    min_size     = each.value.min_size
  }

  dynamic "launch_template" {
    for_each = toset(var.worker_launch_template != null ? ["1"] : [])
    content {
      name    = aws_launch_template.eks_worker["1"].name
      version = aws_launch_template.eks_worker["1"].latest_version
    }
  }

  # launch_template {
  #   name    = aws_launch_template.eks_worker.name
  #   version = aws_launch_template.eks_worker.latest_version
  # }

  # Optional: Allow external changes without Terraform plan difference
  lifecycle {
    ignore_changes = [scaling_config[0].desired_size]
  }

  # Ensure that IAM Role permissions are created before and deleted after EKS Node Group handling.
  # Otherwise, EKS will not be able to properly delete EC2 Instances and Elastic Network Interfaces.
  depends_on = [
    aws_iam_role_policy_attachment.eks_worker_AmazonEKSWorkerNodePolicy,
    aws_iam_role_policy_attachment.eks_worker_AmazonEKS_CNI_Policy,
    aws_iam_role_policy_attachment.eks_worker_AmazonEC2ContainerRegistryReadOnly,
  ]

  tags = merge(each.value.tags,
    {
      "Name" = format("%s-worker-node-group-%s", aws_eks_cluster.eks_cluster.name, each.key)
    },
    { "k8s.io/cluster-autoscaler/enabled" = ""
    },
    {
      "managed_by" = "UTOPIOPS-WATER"
    },
    {
      "stability" = each.value.capacity_type == "SPOT" ? "spot" : "on-demand"
    },
  )

  labels = {
    "terraform/size" = each.value.instance_types[0]
  }
}

resource "local_file" "eks_aws_auth" {
  content         = <<CONFIGMAPAWSAUTH
apiVersion: v1
kind: ConfigMap
metadata:
  name: aws-auth
  namespace: kube-system
data:
  mapRoles: |
    - rolearn: ${aws_iam_role.eks_worker_iam_role.arn}
      username: system:node:{{EC2PrivateDNSName}}
      groups:
        - system:bootstrappers
        - system:nodes
    - groups:
      - system:masters
      rolearn: ${aws_iam_role.helm_manager.arn}
      username: system:node:{{SessionName}}
CONFIGMAPAWSAUTH
  filename        = "${path.module}/aws-auth.yaml"
  file_permission = "0644"
}

resource "null_resource" "eks_bootstrap" {
  provisioner "local-exec" {
    when    = create
    command = <<BOOTSTRAP
    kubectl --kubeconfig ${local_file.eks_kubeconfig.filename} apply -f ${local_file.eks_aws_auth.filename}
BOOTSTRAP

  }


  triggers = {
    config = local_file.eks_kubeconfig.content
    auth   = local_file.eks_aws_auth.content
  }
}


########################################### Security Group
resource "aws_security_group" "eks_worker_sg" {
  name        = format("%s-worker", local.cluster_name)
  description = format("Cluster %s workers security group", local.cluster_name)
  vpc_id      = data.terraform_remote_state.environment_base.outputs.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = (merge(
    tomap({
      "Name"                                                 = format("%s-worker-sg", local.cluster_name)
      format("kubernetes.io/cluster/%s", local.cluster_name) = "owned"
    }),
    var.tags
  ))
}

resource "aws_security_group_rule" "eks_worker_sg_rule_node_to_node" {
  description              = "Allow node to communicate with each other"
  from_port                = 0
  protocol                 = "-1"
  security_group_id        = aws_security_group.eks_worker_sg.id
  source_security_group_id = aws_security_group.eks_worker_sg.id
  to_port                  = 65535
  type                     = "ingress"
}

resource "aws_security_group_rule" "eks_worker_sg_rule_cluster_control_plane_to_node" {
  description              = "Allow worker Kubelets and pods to receive communication from the cluster control plane"
  from_port                = 1025
  protocol                 = "tcp"
  security_group_id        = aws_security_group.eks_worker_sg.id
  source_security_group_id = aws_security_group.eks_sg.id
  to_port                  = 65535
  type                     = "ingress"
}

resource "aws_security_group_rule" "eks_worker_sg_rule_node_to_cluster_control_apiserver" {
  description              = "Allow pods to communicate with the cluster API Server"
  from_port                = 443
  protocol                 = "tcp"
  security_group_id        = aws_security_group.eks_sg.id
  source_security_group_id = aws_security_group.eks_worker_sg.id
  to_port                  = 443
  type                     = "ingress"
}

resource "aws_security_group_rule" "eks_worker_sg_rule_vpc_to_node" {
  description       = "Allow vpc instances to reach worker ssh port"
  from_port         = 22
  protocol          = "tcp"
  security_group_id = aws_security_group.eks_worker_sg.id
  cidr_blocks       = [data.terraform_remote_state.environment_base.outputs.vpc_cidr]
  to_port           = 22
  type              = "ingress"
}

########################################### IAM role
resource "aws_iam_role" "eks_worker_iam_role" {
  name        = format("%s-worker-role", local.cluster_name)
  description = format("Cluster %s workers IAM role", local.cluster_name)
  assume_role_policy = jsonencode({
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
      Principal = {
        Service = "ec2.amazonaws.com"
      }
    }]
    Version = "2012-10-17"
  })
  tags = {
    "managed_by" = "UTOPIOPS-WATER"
  }
}


resource "aws_iam_role_policy_attachment" "eks_worker_AmazonEKSWorkerNodePolicy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKSWorkerNodePolicy"
  role       = aws_iam_role.eks_worker_iam_role.name
}

resource "aws_iam_role_policy_attachment" "eks_worker_AmazonEKS_CNI_Policy" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEKS_CNI_Policy"
  role       = aws_iam_role.eks_worker_iam_role.name
}

// TODO: Delete this readonly is enough
resource "aws_iam_role_policy_attachment" "eks_worker_AmazonEC2ContainerRegistryPowerUser_attachment" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryPowerUser"
  role       = aws_iam_role.eks_worker_iam_role.name
}

resource "aws_iam_role_policy_attachment" "eks_worker_AmazonEC2ContainerRegistryReadOnly" {
  policy_arn = "arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly"
  role       = aws_iam_role.eks_worker_iam_role.name
}


// Roles that worker nodes can assume
resource "aws_iam_policy" "eks_worker_assume_roles_policy" {
  for_each    = toset(length(var.eks_worker_assume_role_arns) > 0 ? ["1"] : [])
  name        = format("%s-assume-role-policy", local.cluster_name)
  description = format("EKS cluster %s assume role policy", local.cluster_name)
  policy      = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
        "Effect": "Allow",
        "Action": "sts:AssumeRole",
        "Resource": [${join(",", var.eks_worker_assume_role_arns)}]
    }
  ]
}
POLICY
}


resource "aws_iam_role_policy_attachment" "eks_worker_assume_roles_policy_attachment" {
  for_each   = toset(length(var.eks_worker_assume_role_arns) > 0 ? ["1"] : [])
  policy_arn = aws_iam_policy.eks_worker_assume_roles_policy["1"].arn
  role       = aws_iam_role.eks_worker_iam_role.name
}

resource "aws_iam_policy" "ssm_access_policy" {
  name        = format("%s-extra-policy", local.cluster_name)
  description = format("EKS cluster %s extra policy", local.cluster_name)
  policy      = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMAccess",
      "Effect": "Allow",
      "Action": [
        "ssmmessages:OpenDataChannel",
        "ssmmessages:OpenControlChannel",
        "ssmmessages:CreateDataChannel",
        "ssmmessages:CreateControlChannel"
      ],
      "Resource": "*"
    },
    {
      "Sid": "",
      "Effect": "Allow",
      "Action": "s3:GetEncryptionConfiguration",
      "Resource": "*"
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "ssm_access_policy_attachment" {
  policy_arn = aws_iam_policy.ssm_access_policy.arn
  role       = aws_iam_role.eks_worker_iam_role.name
}

// TODO: is this required or reqdonly or power user?
resource "aws_iam_policy" "eks_worker_ecr_policy" {
  name        = format("%s-ecr-policy", local.cluster_name)
  description = format("EKS cluster %s ecr policy", local.cluster_name)
  policy      = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "K8NodeECRPerms",
      "Effect": "Allow",
      "Action": [
                "ecr:CreateRepository",
                "ecr:BatchDeleteImage",
                "ecr:InitiateLayerUpload",
                "autoscaling:DescribeTags",
                "autoscaling:DescribeAutoScalingGroups",
                "autoscaling:DescribeAutoScalingInstances",
                "autoscaling:DescribeLaunchConfigurations",
                "autoscaling:DescribeTags",
                "autoscaling:SetDesiredCapacity",
                "autoscaling:TerminateInstanceInAutoScalingGroup"
      ],
      "Resource": "*"
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "eks_worker_ecr_policy_attachment" {
  policy_arn = aws_iam_policy.eks_worker_ecr_policy.arn
  role       = aws_iam_role.eks_worker_iam_role.name
}

resource "aws_iam_policy" "eks_worker_cloud_watch_policy" {
  name        = format("%s-cloud-watch-policy", local.cluster_name)
  description = format("EKS cluster %s cloud watch full access policy", local.cluster_name)
  policy      = <<POLICY
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Action": [
        "autoscaling:Describe*",
        "cloudwatch:*",
        "logs:*",
        "sns:*",
        "iam:GetPolicy",
        "iam:GetPolicyVersion",
        "iam:GetRole"
      ],
      "Effect": "Allow",
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": "iam:CreateServiceLinkedRole",
      "Resource": "arn:aws:iam::*:role/aws-service-role/events.amazonaws.com/AWSServiceRoleForCloudWatchEvents*",
      "Condition": {
        "StringLike": {
          "iam:AWSServiceName": "events.amazonaws.com"
        }
      }
    }
  ]
}
POLICY
}

resource "aws_iam_role_policy_attachment" "eks_worker_cloud_watch_policy_attachment" {
  policy_arn = aws_iam_policy.eks_worker_cloud_watch_policy.arn
  role       = aws_iam_role.eks_worker_iam_role.name
}


// TODO: Allow users to specify extra custom policies to attach to the worker nodes

###########################################################
resource "aws_launch_template" "eks_worker" {
  for_each = toset(var.worker_launch_template != null ? ["1"] : [])
  name     = format("eks-cluster-%s-workers", local.cluster_name)

  vpc_security_group_ids = [aws_security_group.eks_worker_sg.id]

  // todo: support multiple device mappings with different volume types/sizes
  block_device_mappings {
    device_name = "/dev/xvda"

    ebs {
      volume_size = var.worker_launch_template.root_volume_size
      volume_type = "gp2"
    }
  }

  image_id = var.worker_launch_template.image_id
  user_data = base64encode(<<-EOF
MIME-Version: 1.0
Content-Type: multipart/mixed; boundary="==BOUNDARY=="
--==BOUNDARY==
Content-Type: text/x-shellscript; charset="us-ascii"
#!/bin/bash
/etc/eks/bootstrap.sh ${local.cluster_name}
--==BOUNDARY==--\
  EOF
  )

  # tag_specifications {
  #   resource_type = "instance"

  #   tags = {
  #     Name = "EKS-MANAGED-NODE"
  #   }
  # }
}
