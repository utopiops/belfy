variable "db_identifier" {
  description = "Custom name of the instance"
}

variable "is_multi_az" {
  description = "Set to true on production"
  default     = false
}

variable "storage_type" {
  description = "One of 'standard' (magnetic), 'gp2' (general purpose SSD), or 'io1' (provisioned IOPS SSD)."
  default     = "standard"
}

variable "subnet_group" {
  description = "RDS subnet group"
  type = list(string)
  
}

variable "allocated_storage" {
  description = "The allocated storage in GBs"

  # You just give it the number, e.g. 10
}

variable "engine_type" {
  description = "Database engine type"

  # Valid values:
  # aurora (for MySQL 5.6-compatible Aurora)
  # aurora-mysql (for MySQL 5.7-compatible Aurora)
  # aurora-postgresql
  # mariadb
  # mysql
  # oracle-ee
  # oracle-se2
  # oracle-se1
  # oracle-se
  # postgres
  # sqlserver-ee
  # sqlserver-se
  # sqlserver-ex
  # sqlserver-web
  # See http://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
  # --engine
}

variable "engine_version" {
  description = "Database engine version, depends on engine type"

  # For valid engine versions, see:
  # See http://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
  # --engine-version
}

variable "instance_class" {
  description = "Class of RDS instance"

  # Valid values
  # https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.DBInstanceClass.html
}

variable "auto_minor_version_upgrade" {
  description = "Allow automated minor version upgrade"
  default     = true
}

variable "allow_major_version_upgrade" {
  description = "Allow major version upgrade"
  default     = false
}

variable "apply_immediately" {
  description = "Specifies whether any database modifications are applied immediately, or during the next maintenance window"
  default     = false
}

variable "maintenance_window" {
  description = "The window to perform maintenance in. Syntax: 'ddd:hh24:mi-ddd:hh24:mi' UTC "
  default     = "Mon:00:00-Mon:03:00"
}

variable "database_name" {
  description = "The name of the database to create when the DB instance is created"
}

# Self-explainatory variables
variable "database_user" {}

variable "database_password" {}
variable "database_port" {}

# This is for a custom parameter to be passed to the DB
# We're "cloning" default ones, but we need to specify which should be copied
variable "parameter_group_family" {
  description = "Parameter group family, depends on DB engine used"

  # default = "mysql5.6"
  # default = "postgres9.5"
}

variable "publicly_accessible" {
  description = "Bool to control if instance is publicly accessible"
  default     = false
}

# # RDS Subnet Group Variables
# variable "subnets" {
#   description = "List of subnets DB should be available at. It might be one subnet."
#   type        = list(string)
# }

variable "source_cidr" {
  description = "List of subnets VPC subnets used as source for RDS security group"
  type        = list(string)
  default     = []
}


variable "vpc_id" {
  description = "VPC to connect to, used for a security group"
  type        = string
}

variable "skip_final_snapshot" {
  description = "Determines whether a final DB snapshot is created before the DB instance is deleted"
  default     = "true"
}

variable "copy_tags_to_snapshot" {
  description = "Copy all Instance tags to snapshots"
  default     = "true"
}

variable "backup_window" {
  description = "When AWS can run snapshot, can't overlap with maintenance window"
  default     = "22:00-03:00"
}

variable "backup_retention_period" {
  type        = number
  description = "The backup retention period"
  default     = 0
}

variable "tags" {
  description = "A map of tags to add to all resources"
  default     = {}
}

variable "vpc_security_group_id" {
  type = string
  description = "(optional) describe your variable"
}

variable "env_name" {
  type = string
  description = "Environment name"
}

variable "iops" {
  default = "0"
}

variable "is_public" {
  default = "false" // TODO: [MVP-400] Later add this from the database definition
}

variable "region" {
  description = "Region in which this RDS will be created. This is mainly for the consumers of the outputs of this Terraform module."
}

variable "function_name" {
  description = "The name of the lambda function to run the SQL queries on behalf of the user"
}

variable "engine_category" {
  description = "Engine type irrespective of the license or sub-type"
}