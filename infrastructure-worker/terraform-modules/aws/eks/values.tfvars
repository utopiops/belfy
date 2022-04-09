eks_cluster_name = "mytest"
environment      = "mohsen"

environment_state = {
  bucket = "0c44bb81-a94c-49ea-9b9a-ac926a8067ac"
  key    = "utopiops-water/test/environment/mohsen.tfstate"
  region = "us-east-1"
}

eks_version = "1.21"
region = "us-east-2"

tags = {}



instance_groups = [
  {
    name           = "spot_1"
    capacity_type  = "SPOT"
    instance_types = ["t3.micro", "t2.micro"]
    disk_size      = 20
    desired_size   = 1
    max_size       = 2
    min_size       = 0
    tags           = {}
  },
  {
    name           = "spot_2"
    capacity_type  = "SPOT"
    instance_types = ["t3.small", "t3.small"]
    disk_size      = 21
    desired_size   = 1
    max_size       = 3
    min_size       = 1
    tags           = {}
  },
  {
    name           = "on_demand_1"
    capacity_type  = "ON_DEMAND"
    instance_types = ["t3.micro"]
    disk_size      = 22
    desired_size   = 1
    max_size       = 2
    min_size       = 1
    tags           = {}
  }
]

fargate_profiles = [
  {
    "name" = "fargate_default"
    "namespace" = "default"
    "labels" = {
      "run_on"    = "fargate",
      "something" = "test"
    }
  },
  {
    "name" = "uuid-as-user-didnt-provide"
    "namespace" = "mohsen"
    "labels" = {}
  },
]

eks_worker_assume_role_arns = []
