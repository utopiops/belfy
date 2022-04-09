terraform {
  required_providers {
    digitalocean = {
      source = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  features {}
}

terraform {
  backend "s3" {
    endpoint                    = "sfo2.digitaloceanspaces.com"
    key                         = var.key
    bucket                      = var.bucket
    region                      = var.region
    skip_requesting_account_id  = true
    skip_credentials_validation = true
    skip_get_ec2_platforms      = true
    skip_metadata_api_check     = true
  }
}