resource "google_compute_network" "this" {
  name                            = local.environment_name
  auto_create_subnetworks         = false
  routing_mode                    = var.routing_mode
  project                         = var.project_id
  delete_default_routes_on_create = false
}
