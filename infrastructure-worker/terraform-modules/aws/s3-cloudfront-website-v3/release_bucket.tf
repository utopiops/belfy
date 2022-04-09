resource "aws_s3_bucket" "release_bucket" {
  bucket        = format("%s-releases", local.fqdn)
  force_destroy = true
}

resource "null_resource" "upload_to_s3" {
  # todo: find better way for checking release
  count = length(var.release_version) > 0 ? 1 : 0
  triggers = {
    always_run = "${timestamp()}"
  }
  provisioner "local-exec" {
    command = "aws s3 sync s3://${aws_s3_bucket.release_bucket.bucket}/${var.release_version} s3://${aws_s3_bucket.main.bucket} --delete"
  }
}