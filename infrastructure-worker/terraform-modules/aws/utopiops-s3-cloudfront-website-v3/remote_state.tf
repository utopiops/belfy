data "terraform_remote_state" "domain_state" {
  backend = "s3"
  config = {
    bucket = var.domain_state.bucket
    key    = var.domain_state.key
    region = var.domain_state.region
  }
}