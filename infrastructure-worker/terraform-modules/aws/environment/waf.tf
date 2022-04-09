resource "random_string" "rand_8" {
  length  = 8
  special = false
}

resource "random_string" "rand_16" {
  length  = 16
  special = false
}

resource "aws_wafv2_web_acl" "for_albs" {
  for_each = toset(var.alb_waf != null ? ["1"] : [])
  name     = format("%s-alb-waf-%s", var.environment, random_string.rand_16.result)
  scope    = "REGIONAL"

  default_action {
    allow {}
  }

  // rate based rule
  dynamic "rule" {
    for_each = toset(var.alb_waf.rate_limit != 0 ? ["rate-limit"] : [])
    content {
      name     = "rate-limit"
      priority = 9

      action {
        block {}
      }

      statement {
        rate_based_statement {
          limit              = var.alb_waf.rate_limit
          aggregate_key_type = "FORWARDED_IP"
          forwarded_ip_config {
            fallback_behavior = "NO_MATCH"
            header_name       = "X-Forwarded-For"
          }
        }
      }

      visibility_config {
        cloudwatch_metrics_enabled = true
        metric_name                = format("waf-%s-rate-limit", var.environment)
        sampled_requests_enabled   = true
      }
    }
  }
  // managed rules

  dynamic "rule" {
    for_each = { for managed_rule in var.alb_waf.managed_rules : managed_rule => lookup(local.managed_rules, managed_rule) }
    iterator = rule
    content {
      name     = rule.key
      priority = rule.value.priority

      override_action {
        count {}
      }

      statement {
        dynamic "managed_rule_group_statement" {
          for_each = { for i in ["1"] : rule.key => rule.value } // We always have one config per managed rule
          iterator = managed_rule
          content {
            name        = managed_rule.value.managed_rule_group_statement.name
            vendor_name = managed_rule.value.managed_rule_group_statement.vendor_name

            dynamic "excluded_rule" {
              for_each = length(managed_rule.value.managed_rule_group_statement.excluded_rule) == 0 ? [] : toset(managed_rule.value.managed_rule_group_statement.excluded_rule)
              content {
                name = excluded_rule.value
              }
            }
          }
        }
      }
      visibility_config {
        metric_name                = format("%s-%s", var.environment, rule.key)
        cloudwatch_metrics_enabled = rule.value.visibility_config.cloudwatch_metrics_enabled
        sampled_requests_enabled   = rule.value.visibility_config.sampled_requests_enabled
      }
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = format("waf-%s-%s", var.environment, random_string.rand_16.result)
    sampled_requests_enabled   = true
  }

  tags = {
    "Created-By" = "UTOPIOPS-WATER"
  }

}




locals {

  managed_rules = {
    AWS_AWSManagedRulesCommonRuleSet = {
      priority        = 0
      override_action = "none"
      visibility_config = {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
      managed_rule_group_statement = {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
        excluded_rule = [
          "NoUserAgent_HEADER",
          "UserAgent_BadBots_HEADER",
          "GenericRFI_QUERYARGUMENTS"
        ]
      }
    },
    AWS_AWSManagedRulesAmazonIpReputationList = {
      priority        = 1
      override_action = "none"
      visibility_config = {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
      managed_rule_group_statement = {
        name          = "AWSManagedRulesAmazonIpReputationList"
        vendor_name   = "AWS"
        excluded_rule = []
      }
    },
    AWS_AWSManagedRulesKnownBadInputsRuleSet = {
      priority        = 2
      override_action = "none"
      visibility_config = {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
      managed_rule_group_statement = {
        name          = "AWSManagedRulesKnownBadInputsRuleSet"
        vendor_name   = "AWS"
        excluded_rule = []
      }
    },
    AWS_AWSManagedRulesSQLiRuleSet = {
      priority        = 3
      override_action = "none"
      visibility_config = {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
      managed_rule_group_statement = {
        name          = "AWSManagedRulesSQLiRuleSet"
        vendor_name   = "AWS"
        excluded_rule = []
      }
    },
    AWS_AWSManagedRulesLinuxRuleSet = {
      priority        = 4
      override_action = "none"
      visibility_config = {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
      managed_rule_group_statement = {
        name          = "AWSManagedRulesLinuxRuleSet"
        vendor_name   = "AWS"
        excluded_rule = []
      }
    },
    AWS_AWSManagedRulesUnixRuleSet = {
      priority        = 5
      override_action = "none"
      visibility_config = {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
      managed_rule_group_statement = {
        name          = "AWSManagedRulesUnixRuleSet"
        vendor_name   = "AWS"
        excluded_rule = []
      }
    },
    AWS_AWSManagedRulesBotControlRuleSet = {
      priority        = 6
      override_action = "none"
      visibility_config = {
        cloudwatch_metrics_enabled = true
        sampled_requests_enabled   = true
      }
      managed_rule_group_statement = {
        name          = "AWSManagedRulesBotControlRuleSet"
        vendor_name   = "AWS"
        excluded_rule = []
      }
    },
  }
}
