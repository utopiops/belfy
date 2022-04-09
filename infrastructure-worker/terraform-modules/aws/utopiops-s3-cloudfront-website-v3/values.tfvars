redirect_to_www              = false
index_document               = "index.html"
error_document               = "error.html"
acm_certificate_arn          = "arn:aws:acm:us-east-2:994147050565:certificate/39413875-581d-47d3-90d0-330b3a64d6a0"
redirect_acm_certificate_arn = ""
app_name                     = "test-s3"
# release_version = "1.0"
domain_state = {
  bucket = "0c44bb81-a94c-49ea-9b9a-ac926a8067ac"
  key    = "utopiops-water/test/environment/mohsen.tfstate"
  region = "us-east-1"
}
