resource "aws_route53_zone" "this" {
  name = var.domain_name
  tags = {
    CreatedBy = "UTOPIOPS_WATER"
    category  = "UTOPIOPS_WEBSITE"
    accountId = var.account_id
  }
}

resource "aws_acm_certificate" "this" {
  for_each                  = toset(var.create_certificate ? ["1"] : [])
  domain_name               = var.domain_name
  subject_alternative_names = ["*.${var.domain_name}"]
  validation_method         = "DNS"

  tags = {
    CreatedBy = "UTOPIOPS_WATER"
    category  = "UTOPIOPS_WEBSITE"
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "aws_route53_record" "cert_validation" {
  for_each = !var.create_certificate ? {} : {
    for dvo in aws_acm_certificate.this["1"].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  }

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = aws_route53_zone.this.id
}

output "env_domain_name" {
  value = aws_route53_zone.this.name
}

output "env_hosted_zone_id" {
  value = aws_route53_zone.this.zone_id
}

output "name_servers" {
  value = aws_route53_zone.this.name_servers
}

output "certificate_arn" {
  value = var.create_certificate ? aws_acm_certificate.this["1"].arn : ""
}


/*
NOTE: We create the hosted_zone initially and ask the user to do the DNS deligation.
After user asked to verfiy the deligation, we run dig and verfiy the deligation. If 
delegation is done successfully we create the certificate by stting var.create_certificate to true
*/


# Sample outputs:
# certificate_arn = "arn:aws:acm:us-east-1:994147050565:certificate/798da04f-e0d2-47f9-b813-c8519302cc39"
# name_servers = tolist([
#   "ns-1254.awsdns-28.org",
#   "ns-1940.awsdns-50.co.uk",
#   "ns-288.awsdns-36.com",
#   "ns-951.awsdns-54.net",
# ])