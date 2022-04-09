output "address" {
  value = "${aws_db_instance.main_rds_instance.address}"
}

output "arn" {
  value = "${aws_db_instance.main_rds_instance.arn}"
}

output "port" {
  value = "${aws_db_instance.main_rds_instance.port}"
}

output "sg_id" {
  value = "${aws_security_group.db_sg.id}"
}

output "param_group_name" {
  value = "${aws_db_instance.main_rds_instance.parameter_group_name}"
}

output "subnet_group" {
  value = "${var.subnet_group}"
}

output "vpc_id" {
  value = "${var.vpc_id}"
}

output "is_public" {
  value = "${var.is_public}"
}

output "region" {
  value = "${var.region}"
}

output "query_lambda_function_name" {
  value = "${var.function_name}"
}