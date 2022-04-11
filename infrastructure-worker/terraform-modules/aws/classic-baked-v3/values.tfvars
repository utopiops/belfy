app_name    = "test_baked"
environment = "mohsen"
environment_state = {
  bucket = "0c44bb81-a94c-49ea-9b9a-ac926a8067ac"
  key    = "utopiops-water/test/environment/mohsen.tfstate"
  region = "us-east-1"
}

alb_exposed_ports = {
  alb_display_name = "alb1"
  ports = [{
    load_balancer_port  = 80
    host_port           = 80
    dns_prefix          = "ws"
    healthy_threshold   = 2
    unhealthy_threshold = 3
    interval            = 30
    matcher             = "200-299"
    path                = "/"
    timeout             = 5
    }, {
    load_balancer_port  = 80
    host_port           = 81
    dns_prefix          = "ws1"
    healthy_threshold   = 3
    unhealthy_threshold = 4
    interval            = 31
    matcher             = "200-299"
    path                = "/"
    timeout             = 6
    },
  ]
}

nlb_exposed_ports = {
  nlb_display_name = "nlb1"
  ports = [{
    port_number         = 5672
    protocol            = "TCP"
    certificate_arn     = ""
    dns_prefix          = "something1"
    healthy_threshold   = 3
    unhealthy_threshold = 3
    interval            = 30
    }, {
    port_number         = 5673
    protocol            = "UDP"
    certificate_arn     = ""
    dns_prefix          = "something2"
    healthy_threshold   = 4
    unhealthy_threshold = 4
    interval            = 10
    },
  ]
}

instance_groups = [
  {
    display_name = "new_igb",
    count        = 0
    min_size     = 0
    max_size     = 2
    instances = [{
      instance_type     = "t3.micro",
      weighted_capacity = 1
    }],
    root_volume_size = 28,
    key_pair_name    = "",
    labels           = ["aaaaaaa"],
    is_spot          = true
  },
  {
    display_name = "new_ig2b"
    count        = 0
    min_size     = 0
    max_size     = 1
    instances = [{
      instance_type     = "t3.micro"
      weighted_capacity = 1
      },
      {
        instance_type     = "t3.small"
        weighted_capacity = 2
    }],
    root_volume_size = 29,
    key_pair_name    = "",
    labels           = ["bbbbbb"],
    is_spot          = false
  }
]

image_id = "ami-08c1f2f1a424f6ec3"

base64encoded_user_data = "ZWNobyBoaQo="