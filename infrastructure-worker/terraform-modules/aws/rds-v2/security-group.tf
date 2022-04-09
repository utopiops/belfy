# Security groups
resource "aws_security_group" "db_sg" {
  name        = "${local.db_identifier}-rds-access"
  description = "Allow access to the database ${local.db_identifier}"
  vpc_id      = "${var.vpc_id}"

  
}

resource "aws_security_group_rule" "db_inbound" {
  type  = "ingress"

  from_port   = "${var.database_port}"
  to_port     = "${var.database_port}"
  protocol    = "tcp"
  source_security_group_id = "${var.vpc_security_group_id}"

  security_group_id = "${aws_security_group.db_sg.id}"
}

resource "aws_security_group_rule" "db_outbound" {
  type = "egress"

  from_port   = 0
  to_port     = 0
  protocol    = "-1"
  cidr_blocks = ["0.0.0.0/0"]

  security_group_id = "${aws_security_group.db_sg.id}"
}