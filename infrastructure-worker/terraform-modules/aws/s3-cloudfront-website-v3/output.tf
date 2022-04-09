output "main_domain_name" {
  value = local.fqdn
}

output "bucket_name" {
  value = aws_s3_bucket.main.bucket
}
output "release_bucket_name" {
  value = aws_s3_bucket.release_bucket.bucket
}

output "distribution_id" {
  value = aws_cloudfront_distribution.main_distribution.id
}

output "urls" {
  value = [format("https://%s", local.fqdn)]
}
