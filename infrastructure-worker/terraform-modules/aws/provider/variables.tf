variable "bucket_name" {
  type        = string
  description = "Bucket name"  
}

variable "table_name" {
  type        = string
  description = "Dynamodb table name"
}

variable "region" {
  type        = string
  description = "Provider region"
}