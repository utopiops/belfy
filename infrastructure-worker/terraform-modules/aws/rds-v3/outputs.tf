output "enhanced_monitoring_iam_role_name" {
  description = "The name of the monitoring role"
  value       = module.db_instance.enhanced_monitoring_iam_role_name
}

output "enhanced_monitoring_iam_role_arn" {
  description = "The Amazon Resource Name (ARN) specifying the monitoring role"
  value       = module.db_instance.enhanced_monitoring_iam_role_arn
}

output "db_instance_address" {
  description = "The address of the RDS instance"
  value       = module.db_instance.db_instance_address
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = module.db_instance.db_instance_arn
}

output "db_instance_availability_zone" {
  description = "The availability zone of the RDS instance"
  value       = module.db_instance.db_instance_availability_zone
}

output "db_instance_endpoint" {
  description = "The connection endpoint"
  value       = module.db_instance.db_instance_endpoint
}

output "db_instance_hosted_zone_id" {
  description = "The canonical hosted zone ID of the DB instance (to be used in a Route 53 Alias record)"
  value       = module.db_instance.db_instance_hosted_zone_id
}

output "db_instance_id" {
  description = "The RDS instance ID"
  value       = module.db_instance.db_instance_id
}

output "db_instance_resource_id" {
  description = "The RDS Resource ID of this instance"
  value       = module.db_instance.db_instance_resource_id
}

output "db_instance_status" {
  description = "The RDS instance status"
  value       = module.db_instance.db_instance_status
}

output "db_instance_name" {
  description = "The database name"
  value       = module.db_instance.db_instance_name
}

output "db_instance_username" {
  description = "The master username for the database"
  value       = module.db_instance.db_instance_username
  sensitive   = true
}

output "db_instance_password" {
  description = "The database password (this password may be old, because Terraform doesn't track it after initial creation)"
  value       = local.master_password
  sensitive   = true
}

output "db_instance_domain" {
  description = "The ID of the Directory Service Active Directory domain the instance is joined to"
  value       = module.db_instance.db_instance_domain
}

output "db_instance_domain_iam_role_name" {
  description = "The name of the IAM role to be used when making API calls to the Directory Service. "
  value       = module.db_instance.db_instance_domain_iam_role_name
}

output "db_instance_port" {
  description = "The database port"
  value       = module.db_instance.db_instance_port
}

output "db_instance_ca_cert_identifier" {
  description = "Specifies the identifier of the CA certificate for the DB instance"
  value       = module.db_instance.db_instance_ca_cert_identifier
}

output "db_subnet_group_id" {
  description = "The db subnet group name"
  value       = module.db_subnet_group.db_subnet_group_id
}

output "db_subnet_group_arn" {
  description = "The ARN of the db subnet group"
  value       = module.db_subnet_group.db_subnet_group_arn
}

output "db_parameter_group_id" {
  description = "The db parameter group id"
  value       = module.db_parameter_group.db_parameter_group_id
}

output "db_parameter_group_arn" {
  description = "The ARN of the db parameter group"
  value       = module.db_parameter_group.db_parameter_group_arn
}

# DB option group
output "db_option_group_id" {
  description = "The db option group id"
  value       = module.db_option_group.db_option_group_id
}

output "db_option_group_arn" {
  description = "The ARN of the db option group"
  value       = module.db_option_group.db_option_group_arn
}

output "db_master_password" {
  description = "The master password"
  value       = module.db_instance.db_instance_master_password
  sensitive   = true
}

output "query_lambda_function_name" {
  description = "The name of the sql query proxy lambda function"
  value       = aws_lambda_function.sql_queries_proxy_lambda.function_name
}

output "initial_db_name" {
  value = var.initial_db_name
}

# Sample outputs:
# db_instance_address = "mohsen-mohsendb.cywotgkhpfi3.us-east-2.rds.amazonaws.com"
# db_instance_arn = "arn:aws:rds:us-east-2:994147050565:db:mohsen-mohsendb"
# db_instance_availability_zone = "us-east-2b"
# db_instance_ca_cert_identifier = "rds-ca-2019"
# db_instance_domain = ""
# db_instance_domain_iam_role_name = ""
# db_instance_endpoint = "mohsen-mohsendb.cywotgkhpfi3.us-east-2.rds.amazonaws.com:5432"
# db_instance_hosted_zone_id = "Z2XHWR1WZ565X2"
# db_instance_id = "mohsen-mohsendb"
# db_instance_name = "main_db"
# db_instance_password = <sensitive>
# db_instance_port = 5432
# db_instance_resource_id = "db-S5A76ERDID7O43XGUB2ZSBX5ZQ"
# db_instance_status = "available"
# db_instance_username = <sensitive>
# db_master_password = <sensitive>
# db_option_group_arn = ""
# db_option_group_id = ""
# db_parameter_group_arn = "arn:aws:rds:us-east-2:994147050565:pg:mohsen-mohsendb-20210927034714701600000001"
# db_parameter_group_id = "mohsen-mohsendb-20210927034714701600000001"
# db_subnet_group_arn = "arn:aws:rds:us-east-2:994147050565:subgrp:mohsen-mohsendb-20210927032156534300000001"
# db_subnet_group_id = "mohsen-mohsendb-20210927032156534300000001"
# enhanced_monitoring_iam_role_arn = ""
# enhanced_monitoring_iam_role_name = ""
# query_lambda_function_name = "mohsen-mohsendb_sql_queries_proxy"
