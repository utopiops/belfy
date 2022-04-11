variable "alb_name" {
  description = "ALB name"
}
variable "subnets" {
  type = "list"
  description = "List of subnets CIDRs"
}

variable "environment" {
  description = "Environment name"
}
variable "tag_name" {
  description = "Name tag"
}
variable "alb_security_group_name" {
  description = "ALB security group name"
}
variable "alb_security_group_description" {
  description = "ALB security group description"
}
variable "vpc_id" {
  description = "VPC id"
}