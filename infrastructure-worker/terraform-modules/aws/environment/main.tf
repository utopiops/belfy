terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "3.63.0"
    }

  }
  backend "s3" {
    encrypt = true
  }
}

provider "aws" {
  region = var.region
  ignore_tags {
    key_prefixes = ["kubernetes.io/", "k8s.io/"]
  }
}

