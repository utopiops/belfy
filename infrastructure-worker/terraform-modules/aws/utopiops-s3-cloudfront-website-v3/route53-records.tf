locals {
  fqdn        = format("%s.%s", var.app_name, data.terraform_remote_state.domain_state.outputs.env_domain_name)
  apex        = data.terraform_remote_state.domain_state.outputs.env_domain_name
}

// This Route53 record will point at our CloudFront distribution.
resource "aws_route53_record" "main" {
  zone_id = data.terraform_remote_state.domain_state.outputs.env_hosted_zone_id
  name    = local.fqdn
  type    = "A"

  alias {
    name                   = aws_cloudfront_distribution.main_distribution.domain_name
    zone_id                = aws_cloudfront_distribution.main_distribution.hosted_zone_id
    evaluate_target_health = false
  }
}

resource "aws_route53_record" "apex" {
  count   = (var.app_name == "www" && var.redirect_to_www) ? 1 : 0 // The app name should be set to www, this way it's also guaranteed that there will be only one app used to set zone apex
  zone_id = data.terraform_remote_state.domain_state.outputs.env_hosted_zone_id

  // NOTE: name is blank for redirecting apex to www.
  name = ""
  type = "A"

  alias {
    name                   = aws_cloudfront_distribution.redirect_distribution["0"].domain_name
    zone_id                = aws_cloudfront_distribution.redirect_distribution["0"].hosted_zone_id
    evaluate_target_health = false
  }
}
