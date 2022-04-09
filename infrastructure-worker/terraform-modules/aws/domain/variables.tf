variable "region" {
  type = string
  default = "us-east-1"
}
variable "domain_name" {
  type = string
}
variable "account_id" {
  type = string
}
variable "create_certificate" {
  type = bool
  default = false
}