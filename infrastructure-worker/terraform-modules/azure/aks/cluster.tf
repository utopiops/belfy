resource "azurerm_log_analytics_workspace" "this" {
    # The WorkSpace name has to be unique across the whole of azure, not just the current subscription/tenant.
    name                = local.cluster_name
    location            = var.location
    resource_group_name = local.env_resource_group_name
    sku                 = var.log_analytics_workspace_sku
}

resource "azurerm_log_analytics_solution" "this" {
    solution_name         = "ContainerInsights"
    location              = var.location
    resource_group_name   = local.env_resource_group_name
    workspace_resource_id = azurerm_log_analytics_workspace.this.id
    workspace_name        = azurerm_log_analytics_workspace.this.name

    plan {
        publisher = "Microsoft"
        product   = "OMSGallery/ContainerInsights"
    }
}

resource "azurerm_kubernetes_cluster" "this" {
    name                = local.cluster_name
    location            = var.location
    resource_group_name = local.env_resource_group_name
    dns_prefix          = var.dns_prefix

    linux_profile {
        admin_username = "ubuntu"

        ssh_key {
            key_data = file(var.ssh_public_key)
        }
    }

    default_node_pool {
        name            = "default"
        node_count      = var.agent_count
        vm_size         = "Standard_D2_v2"
    }

    identity {
        type = "SystemAssigned"
    }

    addon_profile {
        oms_agent {
        enabled                    = true
        log_analytics_workspace_id = azurerm_log_analytics_workspace.this.id
        }
    }

    network_profile {
        load_balancer_sku = "Standard"
        network_plugin = "kubenet"
    }

    tags = {
    "Created-By"  = "UTOPIOPS-WATER"
    "Environment" = var.environment
  }
}

# This is mainly for test at the moment
resource "local_file" "kubeconfig" {
  depends_on   = [azurerm_kubernetes_cluster.this]
  filename        = "${path.module}/kube_config"
  file_permission = "0644"
  content      = azurerm_kubernetes_cluster.this.kube_config_raw
}