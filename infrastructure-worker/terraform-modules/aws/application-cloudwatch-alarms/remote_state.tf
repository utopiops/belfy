data "terraform_remote_state" "environment_base" {
  backend = "s3"
  config = {
    bucket = var.environment_state.bucket
    key    = var.environment_state.key
    region = var.environment_state.region
  }
}


data "terraform_remote_state" "application_base" {
  for_each = toset(substr(var.alarmName, 0, 3) == "app" ? ["1"] : [])
  backend = "s3"
  config = {
    bucket = var.environment_state.bucket
    key    = var.application_state_key
    region = var.environment_state.region
  }
}