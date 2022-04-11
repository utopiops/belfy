terraform {
  required_providers {
    random = {
      source  = "hashicorp/random"
      version = "3.1.0"
    }
    aws = {
      source  = "hashicorp/aws"
      version = "3.63.0"
    }
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "=2.86.0"
    }

    archive = {
      source  = "hashicorp/archive"
      version = "=2.2.0"
    }

    null = {
      source  = "hashicorp/null"
      version = "=3.1.0"
    }
    google = {
      source  = "hashicorp/google"
      version = "=4.2.1"
    }
  }
}
