// This is only for zone apex domain, e.g. redirect utopiops.com to www.utopiops.com

resource "aws_s3_bucket" "redirect" {
  for_each = toset((local.can_set_dns && var.app_name == "www" && var.redirect_to_www) ? ["0"] : [])
  bucket   = local.apex
  acl      = "public-read"
  policy   = <<POLICY
{
  "Version":"2012-10-17",
  "Statement":[
    {
      "Sid":"AddPerm",
      "Effect":"Allow",
      "Principal": "*",
      "Action":["s3:GetObject"],
      "Resource":["arn:aws:s3:::${local.apex}/*"]
    }
  ]
}
POLICY

  website {
    // Note this redirect. Here's where the magic happens.
    redirect_all_requests_to = "https://www.${local.apex}"
  }
}

resource "aws_cloudfront_distribution" "redirect_distribution" {
  for_each = toset((local.can_set_dns && var.app_name == "www" && var.redirect_to_www) ? ["0"] : [])
  origin {
    custom_origin_config {
      http_port              = "80"
      https_port             = "443"
      origin_protocol_policy = "http-only"
      origin_ssl_protocols   = ["TLSv1", "TLSv1.1", "TLSv1.2"]
    }
    domain_name = aws_s3_bucket.redirect["0"].website_endpoint
    origin_id   = local.apex // * We should potentially be able to re-use the origin_id of the main distribution: origin_id = local.fqdn
  }

  enabled             = true
  default_root_object = var.index_document

  default_cache_behavior {
    viewer_protocol_policy = "redirect-to-https"
    compress               = true
    allowed_methods        = ["GET", "HEAD", "OPTIONS"]
    cached_methods         = ["GET", "HEAD", "OPTIONS"]
    target_origin_id       = local.apex // * and here
    min_ttl                = 0
    default_ttl            = 86400
    max_ttl                = 31536000

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  aliases = ["${local.apex}"]

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn = var.redirect_acm_certificate_arn
    ssl_support_method  = "sni-only"
  }
}

