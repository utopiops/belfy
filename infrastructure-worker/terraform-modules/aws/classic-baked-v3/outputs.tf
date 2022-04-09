output "sg_id" {
  value = aws_security_group.security_group.id
}

output "asg" {
  value = tomap({ for index, instance_group in var.instance_groups : instance_group.display_name => {
    id   = aws_autoscaling_group.instance_groups[instance_group.display_name].id
    name = aws_autoscaling_group.instance_groups[instance_group.display_name].name
    arn  = aws_autoscaling_group.instance_groups[instance_group.display_name].arn
  } })
}

// Note: ALB no matter we can set the dns or not is using host header as the condition so we anyway show the urls for it, but for NLB we set the urls in the output only if we can set the DNS
output "urls" {
  value = concat(
    [
      for index, port in var.alb_exposed_ports.ports : lower(format("%s://%s", data.terraform_remote_state.environment_base.outputs.alb_listener["${var.alb_exposed_ports.alb_display_name}.${port.load_balancer_port}"].protocol,
      format("%s.%s", length(port.dns_prefix) > 0 ? "${port.dns_prefix}__${var.app_name}" : var.app_name, local.env_domain_name)))
    ],
    [
      for index, port in var.nlb_exposed_ports.ports : lower(format("%s://%s", port.protocol,
      aws_route53_record.nlb_records[tostring(port.port_number)].name)) if local.can_set_dns
      # format("%s.%s", length(port.dns_prefix) > 0 ? "${port.dns_prefix}__${var.app_name}" : var.app_name, local.env_domain_name))) if local.can_set_dns
    ]
  )
}

# Sample output:
# asg = tomap({
#   "new_ig2b" = {
#     "arn" = "arn:aws:autoscaling:us-east-2:994147050565:autoScalingGroup:fddd8683-002e-4cd8-8c61-f13d47dc3d81:autoScalingGroupName/terraform-20210920052556685600000009"
#     "id" = "terraform-20210920052556685600000009"
#     "name" = "terraform-20210920052556685600000009"
#   }
#   "new_igb" = {
#     "arn" = "arn:aws:autoscaling:us-east-2:994147050565:autoScalingGroup:8ea166f4-b98a-4d85-b80f-85446619b405:autoScalingGroupName/terraform-20210920052556684800000008"
#     "id" = "terraform-20210920052556684800000008"
#     "name" = "terraform-20210920052556684800000008"
#   }
# })
# sg_id = "sg-0c6c7805cf7240377"
# urls  = [
#     "http://ws__test_baked.mohsen.mytest.com",
#     "http://ws1__test_baked.mohsen.mytest.com",
#     "tcp://something1__test_baked.mohsen.mytest.com",
#     "udp://something2__test_baked.mohsen.mytest.com",
# ]