resource "aws_efs_file_system" "efs" {
  creation_token = "magento-efs"

  tags {
    Name = "magento efs"
  }
}

resource "aws_efs_mount_target" "main" {
  count = "${length(module.vpc.private_subnets)}"

  file_system_id = "${aws_efs_file_system.efs.id}"
  subnet_id      = "${element(module.vpc.private_subnets, count.index)}"

  security_groups = [
    "${aws_security_group.efs_sg.id}",
  ]
}

resource "aws_security_group" "efs_sg" {
  name = "efs-instance-sg"
  description = "EFS security group"
  vpc_id = "${module.vpc.vpc_id}"

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    #security_groups = ["${aws_security_group.}"]
  }


  egress {
      from_port = 0
      to_port = 0
      protocol = "-1"
      cidr_blocks = ["0.0.0.0/0"]
  }

  tags {
    Name = "efs-instance-sg"
  }
}