environment = "mohsen"
hostedZone = {
  parentDomain   = "mytest.com",
  isOwn          = true,
  isCrossAccount = false
}

# public_subnets   = ["10.249.4.0/22", "10.249.8.0/22", "10.249.16.0/22"]
# private_subnets  = ["10.249.32.0/22", "10.249.64.0/22", "10.249.128.0/22"]
vpc_network_cidr = "10.1.0.0/16"
# azs              = ["us-east-1a", "us-east-1b", "us-east-1c"]

albs = [
  {
    displayName = "alb1",
    enable_waf  = true
    is_internal = false
    listenerRules = [
      {
        port           = 80
        protocol       = "HTTP"
        certificateArn = ""
      },
      {
        port           = 8080
        protocol       = "HTTP"
        certificateArn = ""
      },
    ]
  },
  {
    displayName = "alb2",
    enable_waf  = true
    is_internal = false
    listenerRules = [
      {
        port           = 81
        protocol       = "HTTP"
        certificateArn = ""
      },
      {
        port           = 8081
        protocol       = "HTTP"
        certificateArn = ""
      },
    ]
  }
]

nlbs = [
  {
    displayName = "nlb1"
    is_internal = true
  },
  {
    displayName = "nlb2"
    is_internal = false
  }
]

ecs_clusters = [
  {
    displayName = "cluster1",
    instanceGroups = [
      {
        displayName = "new_ig1",
        count       = 0
        minSize     = 0
        maxSize     = 2
        instances = [{
          instanceType     = "t3.micro"
          weightedCapacity = 1
          },
          {
            instanceType     = "t3.small"
            weightedCapacity = 2
        }],
        rootVolumeSize = 30,
        keyPairName    = "",
        labels         = ["aaaaaaa"],
        isSpot         = true
      },
      {
        displayName = "new_ig2",
        count       = 0
        minSize     = 0
        maxSize     = 1
        instances = [{
          instanceType     = "t3.micro"
          weightedCapacity = 1
          },
          {
            instanceType     = "t3.small"
            weightedCapacity = 2
        }],
        rootVolumeSize = 30,
        keyPairName    = "",
        labels         = ["bbbbbb"],
        isSpot         = false
      }
    ]
  },
  {
    displayName = "cluster2",
    instanceGroups = [
      {
        displayName = "new_ig21",
        count       = 0
        minSize     = 0
        maxSize     = 2
        instances = [{
          instanceType     = "t3.micro"
          weightedCapacity = 1
        }],
        rootVolumeSize = 30,
        keyPairName    = "",
        labels         = ["cccccccc"],
        isSpot         = true
      }
    ]
  }
]


alb_waf = {
  create        = true
  rate_limit    = 500
  managed_rules = ["AWS_AWSManagedRulesLinuxRuleSet", "AWS_AWSManagedRulesCommonRuleSet"]
}
