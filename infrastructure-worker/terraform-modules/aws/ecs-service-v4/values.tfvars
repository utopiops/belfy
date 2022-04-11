app_name    = "mytest"
environment = "mohsen"

environment_state = {
  bucket = "0c44bb81-a94c-49ea-9b9a-ac926a8067ac"
  key    = "utopiops-water/test/environment/mohsen.tfstate"
  region = "us-east-1"
}


############################### Task definition and service ############################
containers = [
  {
    image = ""
    name  = "main"
    ports = [{
      containerPort = 3000
      hostPort      = 0
    }]
    environmentVariables = [
      {
        name  = "test1"
        value = "value1"
      },
      {
        name  = "test2"
        value = "value2"
      }
    ],
    cpu               = 256
    memory            = 512
    memoryReservation = 64
    retentionInDays   = 1
  },
  {
    name  = "nginx"
    image = "nginx"
    ports = [{
      containerPort = 80
      hostPort      = 0
      }
    ]
    environmentVariables = [
      {
        name  = "xtest1"
        value = "xvalue1"
      }
    ],
    cpu               = 128
    memory            = 128
    memoryReservation = 64
    retentionInDays   = 1
  }
]


# network_mode = "bridge"
# memory = 512
# cpu = 512

exposed_container_name = "main"
exposed_container_port = 3000

# certificate_arn = ""
should_set_dns = true

# host_name = ""

task_role_arn = ""

########################### Target Group Config ################################
health_check_path   = "/health"
healthy_threshold   = 5
unhealthy_threshold = 2
interval            = 30
matcher             = "200-299"
timeout             = 5

alb_name          = "alb1"
alb_listener_port = 80
container_tags = {
  main = "master-123"
}

service_desired_count              = 2
deployment_minimum_healthy_percent = 50
ecs_cluster_name                   = "cluster1"

service_autoscaling = {
  min_capacity    = 1
  max_capacity    = 3
  metric_to_track = "cpu"
  target_value    = 5
}
