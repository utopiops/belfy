resource "aws_alb" "network_load_balancer" {
  for_each           = { for index, nlb in var.nlbs : nlb.displayName => nlb }
  load_balancer_type = "network"
  internal           = each.value.is_internal
  subnets            = module.vpc.private_subnets

  tags = {
    CreatedBy   = "UTOPIOPS_WATER"
    Environment = var.environment
    Name        = format("%s-%s", var.environment, each.value.displayName)
  }
}
