resource "random_string" "rand_8" {
  length  = 8
  upper   = false
  special = false
}

locals {
  name_prefix = format("%s-%s", var.environment, var.app_name)
}