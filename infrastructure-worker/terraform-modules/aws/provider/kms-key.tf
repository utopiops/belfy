resource "aws_kms_key" "state_key" {
  description = "Water State user KMS key"
  
  tags = {
    CreatedBy   = "Water"
  }
}