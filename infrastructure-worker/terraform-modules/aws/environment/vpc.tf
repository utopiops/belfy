data "aws_availability_zones" "azs" {
  state                  = "available"
  all_availability_zones = true

  filter {
    name   = "opt-in-status"
    values = ["opted-in", "opt-in-not-required"]
  }
}

locals {
  cidrs_3 = cidrsubnets(var.vpc_network_cidr, 6, 6, 6, 6, 6, 6)
  cidrs_4 = cidrsubnets(var.vpc_network_cidr, 4, 4, 4, 4, 4, 4, 4, 4)
  az_count = min(var.availability_zones_count, length(data.aws_availability_zones.azs.names))
}


module "vpc" {
  source               = "terraform-aws-modules/vpc/aws"
  version              = "3.7.0"
  name                 = length(var.vpc_name) > 0 ? var.vpc_name : format("%s-environment", var.environment)
  cidr                 = var.vpc_network_cidr
  azs                  = length(var.azs) > 0 ? var.azs : slice(data.aws_availability_zones.azs.names, 0, local.az_count)
  public_subnets       = length(var.azs) > 0 ? var.public_subnets : local.az_count == 2 ? slice(local.cidrs_3, 0, 2) : local.az_count == 3 ? slice(local.cidrs_3, 0, 3) : slice(local.cidrs_4, 0, 4)
  private_subnets      = length(var.azs) > 0 ? var.private_subnets : local.az_count == 2 ? slice(local.cidrs_3, 2, 4) : local.az_count == 3 ? slice(local.cidrs_3, 3, 6) : slice(local.cidrs_4, 4, 8)
  enable_nat_gateway   = var.enable_nat_gateway
  enable_dns_support   = var.enable_dns_support
  enable_dns_hostnames = var.enable_dns_hostnames
  single_nat_gateway   = var.single_nat_gateway

  tags = {
    CreatedBy   = "UTOPIOPS-WATER"
    Environment = var.environment
  }
}