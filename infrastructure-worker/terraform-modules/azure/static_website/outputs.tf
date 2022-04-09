output "primary_web_endpoint" {
  value = azurerm_storage_account.this.primary_web_endpoint
}

output "edge_endpoint" {
  value = format("https://%s.azureedge.net", azurerm_cdn_endpoint.this.name)
}

output "fqdn" {
  value = "https://${azurerm_dns_cname_record.this.name}.${data.terraform_remote_state.environment_base.outputs.dns_zone_name}"
}

output "release_bucket_url" {
  value = "https://${azurerm_storage_account.release.name}.blob.core.windows.net/releases"
}

output "cdn_profile_name" {
  value = azurerm_cdn_profile.this.name
}