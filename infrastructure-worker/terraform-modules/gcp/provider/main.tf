#Note: We must pass the path to the credentials json file in the environment variable GOOGLE_APPLICATION_CREDENTIALS


terraform {
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

resource "google_storage_bucket" "tfstate" {
  name          = var.bucket_name
  location      = var.region
  force_destroy = true
  storage_class = "REGIONAL"
  versioning {
    enabled = true
  }
}


resource "google_project_service" "cloudresourcemanager" {
  project = var.project_id
  service = "cloudresourcemanager.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "compute" {
  project = var.project_id
  service = "compute.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "vpcaccess" {
  project = var.project_id
  service = "vpcaccess.googleapis.com"
  disable_dependent_services = true
}
resource "google_project_service" "monitoring" {
  project = var.project_id
  service = "monitoring.googleapis.com"
  disable_dependent_services = true
}
resource "google_project_service" "logging" {
  project = var.project_id
  service = "logging.googleapis.com"
  disable_dependent_services = true
}
resource "google_project_service" "iam" {
  project = var.project_id
  service = "iam.googleapis.com"
  disable_dependent_services = true
}

resource "google_project_service" "dns" {
  project = var.project_id
  service = "dns.googleapis.com"
  disable_dependent_services = true
}

