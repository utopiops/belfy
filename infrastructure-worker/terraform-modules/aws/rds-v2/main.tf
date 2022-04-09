locals {
  db_identifier = "${format("%s-%s", var.env_name, var.db_identifier)}"
}
resource "aws_db_subnet_group" "default" {
  name_prefix= "water"
  subnet_ids = var.subnet_group
  lifecycle {
    create_before_destroy = true
  }
}

######################## Dynamically created resources #################################
########### MUST leave the last line an empty line
