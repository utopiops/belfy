#Note: We must pass the path to the credentials json file in the environment variable GOOGLE_APPLICATION_CREDENTIALS


terraform {
  
  backend "gcs" {
  }
  
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "=4.2.1"
    }
  }
}

provider "google" {
  project = var.project_id // User needs to create the project first and take a note of the project ID
  region  = var.region
}



