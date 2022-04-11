resource "aws_security_group" "main" {
  name = format("redis-%s", local.cluster_name)
}

resource "aws_security_group_rule" "vpc_access" {
  description       = "Allow vpc instances to reach the redis cluster"
  from_port         = 6379
  to_port           = 6379
  protocol          = "tcp"
  security_group_id = aws_security_group.main.id
  cidr_blocks       = [data.terraform_remote_state.environment_base.outputs.vpc_cidr]
  type              = "ingress"
}
