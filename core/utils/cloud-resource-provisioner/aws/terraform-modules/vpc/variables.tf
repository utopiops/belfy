
variable "environment" {
  description = "Environment name"
}

########################### VPC Config ################################

variable "vpc_name" {
  description = "VPC name"
}

variable "tag_name" {
  description = "Name tag"
}


variable "azs" {
  type = "list"
  description = "List of availability zones"
}
variable "public_subnets" {
  type = "list"
  description = "List of public subnets CIDRs"
}

variable "private_subnets" {
  type = "list"
  description = "List of private subnets CIDRs"
}


variable "vpc_network_cidr" {
  description = "IP addressing for Test Network"
}

