output "arn" {
  value = "${aws_ssm_parameter.secret.arn}"
}
