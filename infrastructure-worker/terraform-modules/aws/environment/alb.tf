############################### ALBs #############################
resource "aws_alb" "load_balancer" {
  for_each           = { for index, alb in var.albs : alb.displayName => alb }
  load_balancer_type = "application"
  internal           = each.value.is_internal
  security_groups    = [aws_security_group.elb_sg[each.key].id]
  subnets            = module.vpc.public_subnets

  tags = {
    CreatedBy   = "UTOPIOPS_WATER"
    Environment = var.environment
    Name        = format("%s-%s", var.environment, each.value.displayName)
  }
}

resource "aws_security_group" "elb_sg" {
  for_each               = { for index, alb in var.albs : alb.displayName => alb }
  description            = format("ALB %s-%s security group", var.environment, each.value.displayName)
  vpc_id                 = module.vpc.vpc_id
  revoke_rules_on_delete = true

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  lifecycle {
    create_before_destroy = true
  }

}

############################### ALB listeners #############################
locals {
  alb_listeners = flatten([
    for i, alb in var.albs : [
      for j, listener in alb.listenerRules : {
        load_balancer_arn = aws_alb.load_balancer[alb.displayName].arn
        alb_display_name  = alb.displayName
        port              = listener.port
        protocol          = listener.protocol
        certificate_arn   = listener.certificateArn
      }
    ]
  ])
}

resource "aws_alb_listener" "alb_listener" {
  for_each          = { for index, alb_listener in local.alb_listeners : "${alb_listener.alb_display_name}.${alb_listener.port}" => alb_listener }
  load_balancer_arn = each.value.load_balancer_arn
  port              = each.value.port
  protocol          = each.value.protocol
  ssl_policy        = length(each.value.certificate_arn) > 0 ? "ELBSecurityPolicy-2016-08" : null
  certificate_arn   = length(each.value.certificate_arn) > 0 ? each.value.certificate_arn : null

  default_action {
    type = "fixed-response"
    fixed_response {
      content_type = "text/plain"
      message_body = "HEALTHY"
      status_code  = "200"
    }
  }
}



resource "aws_security_group_rule" "alb_sg_rule" {
  for_each          = { for index, alb_listener in local.alb_listeners : "${alb_listener.alb_display_name}.${alb_listener.port}" => alb_listener }
  type              = "ingress"
  from_port         = each.value.port
  to_port           = each.value.port
  protocol          = "tcp"
  cidr_blocks       = ["0.0.0.0/0"]
  security_group_id = aws_security_group.elb_sg[each.value.alb_display_name].id
}


resource "aws_wafv2_web_acl_association" "waf_alb" {
  for_each     = { for index, alb in var.albs : alb.displayName => aws_alb.load_balancer[alb.displayName].arn if var.alb_waf != null && alb.enable_waf }
  resource_arn = each.value
  web_acl_arn  = aws_wafv2_web_acl.for_albs["1"].arn
}
