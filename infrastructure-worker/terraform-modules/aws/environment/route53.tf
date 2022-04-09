locals {
  fqdn = var.domain.dns
}
// Create a hosted zone for the entire environment if domain.create is set to true
resource "aws_route53_zone" "env_hosted_zone" {
  for_each = toset(var.domain.create ? ["0"] : [])
  name     = local.fqdn
}

// Find the parent hosted zone to which the environment NS records should be added
data "aws_route53_zone" "parent" {
  for_each = toset(!var.domain.create ? ["0"] : [])
  name     = local.fqdn
}


