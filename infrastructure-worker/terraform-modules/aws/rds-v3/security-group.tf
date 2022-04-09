# Security groups
resource "aws_security_group" "db_sg" {
  description = "Allow access to the database ${local.db_identifier}"
  vpc_id      = data.terraform_remote_state.environment_base.outputs.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "db_inbound_all_vpc" {
  type              = "ingress"
  from_port         = var.port
  to_port           = var.port
  protocol          = "tcp"
  cidr_blocks       = [data.terraform_remote_state.environment_base.outputs.vpc_cidr]
  security_group_id = aws_security_group.db_sg.id
}
resource "aws_security_group_rule" "db_inbound_from_lambda" {
  type                     = "ingress"
  from_port                = var.port
  to_port                  = var.port
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.lambda_sg.id
  security_group_id        = aws_security_group.db_sg.id
}

resource "aws_security_group" "lambda_sg" {
  description = "Allow access to the database ${local.db_identifier}"
  vpc_id      = data.terraform_remote_state.environment_base.outputs.vpc_id
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

resource "aws_security_group_rule" "lambda_inbound_all_vpc" {
  type              = "ingress"
  from_port         = var.port
  to_port           = var.port
  protocol          = "tcp"
  cidr_blocks       = [data.terraform_remote_state.environment_base.outputs.vpc_cidr]
  security_group_id = aws_security_group.lambda_sg.id
}

