resource "aws_s3_bucket" "bucket" {
  bucket = "${var.bucket_name}"
  force_destroy = true
  acl    = "private"

  tags = {
    Name        = "${var.bucket_name}"
    CreatedBy   = "Water"
  }

  logging {
    target_bucket = "${aws_s3_bucket.logs_bucket.id}"
    target_prefix = "water/"
  }

  versioning {
    enabled = true
  }
}

resource "aws_s3_bucket" "logs_bucket" {
  bucket = "${var.bucket_name}-logs"
  force_destroy = true
  acl    = "log-delivery-write"

  tags = {
    Name        = "${var.bucket_name}-logs"
    CreatedBy   = "Water"
  }
}