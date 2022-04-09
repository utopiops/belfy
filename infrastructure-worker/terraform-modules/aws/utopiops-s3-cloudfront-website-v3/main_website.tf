resource "aws_s3_bucket" "main" {
  force_destroy = true
  // Our bucket's name is going to be the same as our site's domain name.
  bucket = local.fqdn
  // Because we want our site to be available on the internet, we set this so
  // anyone can read this bucket.
  acl = "public-read"
  // We also need to create a policy that allows anyone to view the content.
  // This is basically duplicating what we did in the ACL but it's required by
  // AWS. This post: http://amzn.to/2Fa04ul explains why.
  policy = <<POLICY
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"AddPerm",
      "Effect":"Allow",
      "Principal": "*",
      "Action":["s3:GetObject"],
      "Resource":["arn:aws:s3:::${local.fqdn}/*"]
    }
  ]
}
POLICY

  website {
    // Here we tell S3 what to use when a request comes in to the root
    index_document = var.index_document
    // The page to serve up if a request results in an error or a non-existing
    // page.
    error_document = var.error_document
  }
}

resource "aws_cloudfront_distribution" "main_distribution" {

  origin {
    // We need to set up a "custom" origin because otherwise CloudFront won't
    // redirect traffic from the root domain to the www domain, that is from
    // runatlantis.io to www.runatlantis.io.
    custom_origin_config {
      // These are all the defaults.
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }

    domain_name = aws_s3_bucket.main.website_endpoint
    // This can be any name to identify this origin.
    origin_id = local.fqdn
  }

  enabled             = true
  default_root_object = var.index_document
  aliases             = ["${local.fqdn}"]

  // All values are defaults from the AWS console.
  default_cache_behavior {
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    // This needs to match the `origin_id` above.
    target_origin_id = local.fqdn
    min_ttl          = 0
    default_ttl      = var.default_ttl
    max_ttl          = var.max_ttl

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  // Here we're ensuring we can hit this distribution using www.runatlantis.io
  // rather than the domain name CloudFront gives us.
  # aliases = ["${var.main_domain_name}"]

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  // Here's where our certificate is loaded in!
  viewer_certificate {
    acm_certificate_arn = data.terraform_remote_state.domain_state.outputs.certificate_arn
    ssl_support_method  = "sni-only"
  }
}

