module "vpc" {
  source                = "terraform-aws-modules/vpc/aws"
  name                  = "${var.vpc_name}"
  cidr                  = "${var.vpc_network_cidr}"
  azs                   = "${var.azs}"
  public_subnets        = "${var.public_subnets}"
  private_subnets       = "${var.private_subnets}"

  enable_nat_gateway    = true
  enable_dns_support    = true
  enable_dns_hostnames  = true

  tags = {
    Environment = "${var.environment}"
    Name        = "${var.tag_name}"
  }
}