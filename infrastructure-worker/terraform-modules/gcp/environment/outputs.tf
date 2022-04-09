output "cidrs" {
  value = local.cidrs
}


output "env_name_servers" {
  value = var.dns.is_own ? google_dns_managed_zone.this[0].name_servers : []
}

output "env_dns_zone_name" {
  value = var.dns.is_own ? google_dns_managed_zone.this[0].name : !var.dns.is_cross_account ? data.google_dns_managed_zone.parent[0].name : null
}

# Sample outputs
# cidrs = tolist([
#   "10.0.0.0/10",
# ])
# env_dns_zone_name = "dev-gcp-utopiops-com"
# env_name_servers = tolist([
#   "ns-cloud-b1.googledomains.com.",
#   "ns-cloud-b2.googledomains.com.",
#   "ns-cloud-b3.googledomains.com.",
#   "ns-cloud-b4.googledomains.com.",
# ])