resource "google_compute_subnetwork" "this" { // Note: at the moment we don't support flow logs and we we create the subnet only in one region
  for_each                 = local.subnets
  name                     = format("%s-%s", local.environment_name, each.key)
  ip_cidr_range            = each.value.cidr
  region                   = each.key
  private_ip_google_access = true
  network                  = google_compute_network.this.name
  project                  = var.project_id
}
