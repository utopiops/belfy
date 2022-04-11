resource "aws_dynamodb_table" "dynamodb-terraform-state-lock" {
  name = "${var.table_name}"
  hash_key = "LockID"
  read_capacity = 2
  write_capacity = 2
 
  attribute {
    name = "LockID"
    type = "S"
  }
 
  tags = {
    Name = "DynamoDB Terraform State Lock Table"
    CreatedBy = "Water"
  }
}