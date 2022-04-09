output "bucket_name" {
  value = aws_s3_bucket.main.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.main_distribution.id
}

output "urls" {
  value = [format("https://%s", local.fqdn)]
}
