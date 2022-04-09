// Create a DNS zone for the entire environment if is_own is set to true
resource "google_dns_managed_zone" "this" {
  for_each    = toset(var.dns.is_own ? ["0"] : [])
  name        = replace(local.fqdn, ".", "-")
  dns_name    = "${local.fqdn}."
  description = "Environment ${var.environment}"
  # labels = {
  #   CreatedBy   = "UTOPIOPS_WATER"
  #   Environment = var.environment
  # }
}

// Find the parent DNS zone to which the environment NS records should be added (if is_own is true and is_cross_account is false)
data "google_dns_managed_zone" "parent" {
  for_each = toset((var.dns.is_own && !var.dns.is_cross_account) ? ["0"] : [])
  name     = replace(var.dns.parent_domain, ".", "-") // Your parent domain must be in the format of parent-domain-suffix, e.g. example-come
}

// Add the environment NS records to the parent DNS zone (if is_own is true and is_cross_account is false)
resource "google_dns_record_set" "ns_records" {
  for_each     = toset((var.dns.is_own && !var.dns.is_cross_account) ? ["0"] : [])
  name         = local.fqdn
  ttl          = 300
  type         = "NS"
  managed_zone = data.google_dns_managed_zone.parent["0"].name
  rrdatas      = google_dns_managed_zone.this["0"].name_servers
}
