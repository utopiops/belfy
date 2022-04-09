output "vpc_id" {
  value = module.vpc.vpc_id
}

output "vpc_cidr" {
  value = var.vpc_network_cidr
}

output "public_subnets" {
  value = module.vpc.public_subnets
}
output "private_subnets" {
  value = module.vpc.private_subnets
}

output "default_security_group_id" {
  value = module.vpc.default_security_group_id
}


############################################ ALB #############################
output "albs" {
  value = tomap({ for index, alb in var.albs : alb.displayName => {
    arn      = aws_alb.load_balancer[alb.displayName].arn
    name     = aws_alb.load_balancer[alb.displayName].name
    dns_name = aws_alb.load_balancer[alb.displayName].dns_name
    zone_id  = aws_alb.load_balancer[alb.displayName].zone_id
    }
  })
}

output "nlbs" {
  value = tomap({ for index, nlb in var.nlbs : nlb.displayName => {
    arn      = aws_alb.network_load_balancer[nlb.displayName].arn
    name     = aws_alb.network_load_balancer[nlb.displayName].name
    dns_name = aws_alb.network_load_balancer[nlb.displayName].dns_name
    zone_id  = aws_alb.network_load_balancer[nlb.displayName].zone_id
    }
  })
}

output "alb_security_groups" {
  value = tomap({ for index, alb in var.albs : alb.displayName => {
    id   = aws_security_group.elb_sg[alb.displayName].id
    name = aws_security_group.elb_sg[alb.displayName].name
    }
  })
}
output "alb_listener" {
  value = tomap({ for index, alb_listener in local.alb_listeners : "${alb_listener.alb_display_name}.${alb_listener.port}" => {
    arn      = aws_alb_listener.alb_listener["${alb_listener.alb_display_name}.${alb_listener.port}"].arn
    protocol = aws_alb_listener.alb_listener["${alb_listener.alb_display_name}.${alb_listener.port}"].protocol
    }
  })
}

############################################ ECS #############################
output "ecs_cluster" {
  value = tomap({ for index, cluster in var.ecs_clusters : cluster.displayName => {
    id   = aws_ecs_cluster.ecs_cluster[cluster.displayName].id
    name = aws_ecs_cluster.ecs_cluster[cluster.displayName].name
    arn  = aws_ecs_cluster.ecs_cluster[cluster.displayName].arn
    }
  })
}

output "ecs_cluster_default_capacity_providers" {
  value = local.ecs_cluster_default_capacity_providers
}

############################################ Route 53 #############################
output "env_hosted_zone_id" {
  value = var.domain.create ? aws_route53_zone.env_hosted_zone["0"].zone_id : data.aws_route53_zone.parent[0].zone_id
}
output "env_domain_name" {
  value = local.fqdn
}
output "env_name_servers" {
  value = var.domain.create ? aws_route53_zone.env_hosted_zone[0].name_servers : data.aws_route53_zone.parent[0].name_servers
}

output "availability_zones" {
  value = {
    zone_ids = data.aws_availability_zones.azs.zone_ids
    names    = data.aws_availability_zones.azs.names
  }
}

# Sample output
# alb_listener = tomap({
#   "alb1.80" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:listener/app/tf-lb-20210918085753375300000016/6466a2bd53c80dfa/5aa1bf2e798ea87a"
#     "protocol" = "HTTP"
#   }
#   "alb1.8080" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:listener/app/tf-lb-20210918085753375300000016/6466a2bd53c80dfa/18d1def8ede0dc7e"
#     "protocol" = "HTTP"
#   }
#   "alb2.8081" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:listener/app/tf-lb-20210918085753377400000017/66fc5b7e771b33a1/ec70df94fa595d66"
#     "protocol" = "HTTP"
#   }
#   "alb2.81" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:listener/app/tf-lb-20210918085753377400000017/66fc5b7e771b33a1/eec94396faa739c3"
#     "protocol" = "HTTP"
#   }
# })
# alb_security_groups = tomap({
#   "alb1" = {
#     "id" = "sg-04640c7c911e9233d"
#     "name" = "terraform-2021091808574129280000000c"
#   }
#   "alb2" = {
#     "id" = "sg-0245cd1f521c785fd"
#     "name" = "terraform-20210918085740829600000008"
#   }
# })
# albs = tomap({
#   "alb1" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:loadbalancer/app/tf-lb-20210918085753375300000016/6466a2bd53c80dfa"
#     "dns_name" = "tf-lb-20210918085753375300000016-1471719965.us-east-2.elb.amazonaws.com"
#     "name" = "tf-lb-20210918085753375300000016"
#     "zone_id" = "Z3AADJGX6KTTL2"
#   }
#   "alb2" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:loadbalancer/app/tf-lb-20210918085753377400000017/66fc5b7e771b33a1"
#     "dns_name" = "tf-lb-20210918085753377400000017-1283842038.us-east-2.elb.amazonaws.com"
#     "name" = "tf-lb-20210918085753377400000017"
#     "zone_id" = "Z3AADJGX6KTTL2"
#   }
# })
# availability_zones = {
#   "names" = tolist([
#     "us-east-2a",
#     "us-east-2b",
#     "us-east-2c",
#   ])
#   "zone_ids" = tolist([
#     "use2-az1",
#     "use2-az2",
#     "use2-az3",
#   ])
# }
# default_security_group_id = "sg-0f6f03fa4c1c15bcc"
# ecs_cluster = tomap({
#   "cluster1" = {
#     "arn" = "arn:aws:ecs:us-east-2:994147050565:cluster/2479a356-dffd-f0a5-3a3e-9c657580cca7"
#     "id" = "arn:aws:ecs:us-east-2:994147050565:cluster/2479a356-dffd-f0a5-3a3e-9c657580cca7"
#     "name" = "2479a356-dffd-f0a5-3a3e-9c657580cca7"
#   }
#   "cluster2" = {
#     "arn" = "arn:aws:ecs:us-east-2:994147050565:cluster/dddce123-ddad-9209-9cfa-35e39c6fce46"
#     "id" = "arn:aws:ecs:us-east-2:994147050565:cluster/dddce123-ddad-9209-9cfa-35e39c6fce46"
#     "name" = "dddce123-ddad-9209-9cfa-35e39c6fce46"
#   }
# })
# ecs_cluster_default_capacity_providers = {
#   "cluster1" = [
#     {
#       "base" = 0
#       "capacity_provider" = "699fd774-c7f6-aaa5-5177-94ea32c689cc"
#       "weight" = 1
#     },
#     {
#       "base" = 0
#       "capacity_provider" = "77beea1f-11e7-9838-b5a9-0680b482cfe4"
#       "weight" = 1
#     },
#   ]
#   "cluster2" = [
#     {
#       "base" = 0
#       "capacity_provider" = "92f22aa2-c7f6-7edb-3afb-c818b25afa07"
#       "weight" = 1
#     },
#   ]
# }
# env_domain_name = "mohsen.mytest.com"
# env_hosted_zone_id = "Z03260373O43W6ZGJ9AKD"
# env_name_servers = tolist([
#   "ns-1065.awsdns-05.org",
#   "ns-1806.awsdns-33.co.uk",
#   "ns-701.awsdns-23.net",
#   "ns-85.awsdns-10.com",
# ])
# nlbs = tomap({
#   "nlb1" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:loadbalancer/net/tf-lb-20210925104842286500000002/8146fb2d7a072d7d"
#     "dns_name" = "tf-lb-20210925104842286500000002-8146fb2d7a072d7d.elb.us-east-2.amazonaws.com"
#     "name" = "tf-lb-20210925104842286500000002"
#     "zone_id" = "ZLMOA37VPKANP"
#   }
#   "nlb2" = {
#     "arn" = "arn:aws:elasticloadbalancing:us-east-2:994147050565:loadbalancer/net/tf-lb-20211011110722527600000008/e0ae8e6ffd4af7d9"
#     "dns_name" = "tf-lb-20211011110722527600000008-e0ae8e6ffd4af7d9.elb.us-east-2.amazonaws.com"
#     "name" = "tf-lb-20211011110722527600000008"
#     "zone_id" = "ZLMOA37VPKANP"
#   }
# })
# private_subnets = [
#   "subnet-0adea0152852bd9c5",
#   "subnet-0f874b60c88317676",
#   "subnet-0dbbf8bcca5f2707a",
# ]
# public_subnets = [
#   "subnet-0295fa1693e5931e9",
#   "subnet-014e22d6d73c54391",
#   "subnet-04fd5ee292057ffc5",
# ]
# vpc_cidr = "10.1.0.0/16"
# vpc_id = "vpc-0af4fc5a724d56528"
