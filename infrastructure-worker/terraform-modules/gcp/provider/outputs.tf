output "bucket_name" {
  value = google_storage_bucket.tfstate.name
}

output "region" {
  value = var.region
}

output "project_id" {
  value = var.project_id
}

# Sample output:
# bucket_name = "test_provider_states"
# project_id = "premium-guide-332903"
# region = "us-east1"
