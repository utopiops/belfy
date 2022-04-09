data "terraform_remote_state" "environment_base" {
  backend = "s3"
  config = {
    bucket = var.environment_state.bucket
    key    = var.environment_state.key
    region = var.environment_state.region
  }
}
